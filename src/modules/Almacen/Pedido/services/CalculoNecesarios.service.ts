import { QueryTypes } from 'sequelize';
import { dbLocal, dbPoly } from '../../../../config/db';

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR NECESARIOS
//   Para pedidos de las sucursales (farmacias) aún sin surtir, calcula cuánto necesita REALMENTE cada artículo según lo que
//   vende la sucursal en los días que tiene que cubrir ese envío, restando lo que ya tiene, lo que ya va en camino
//   (traslados en PolyDB: REM) y lo que ya está pedido en otros pedidos. Solo calcula: no modifica pedidos ni existencias.
// ─────────────────────────────────────────────────────────────────────────────

// El almacén envía lunes, miércoles y viernes; la sucursal recibe al día siguiente (martes, jueves y sábado)
const DIAS_ENVIO = [1, 3, 5];
const DIAS_LLEGADA = [2, 4, 6];
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const VENTANA_DIAS = 84;                  // 12 semanas: cada día de la semana aparece 12 veces
const SEMANAS_VENTANA = VENTANA_DIAS / 7;
const MIN_DIAS_CON_VENTA = 3;             // para sugerir un artículo que NO viene en el pedido
const STATUS_REM_PENDIENTE = ['C'];       // recibo de PolyDB capturado y aún sin recibir en la sucursal
const DIAS_REM = 7;
const STATUS_COMPROMETIDOS = ['CA', 'SU', 'CH', 'EM'];   // otros pedidos de la sucursal que ya están pedidos y sin facturar
const STATUS_CALCULABLES = ['EC', 'CO', 'CA'];           // pedidos antes de surtirse
const MAX_FALTANTES = 300;

const num = (v: unknown) => Number(v ?? 0) || 0;

export interface FilaNecesario {
    id_articulo: string | null;
    cod_int_artic: number;
    des_artic: string;
    cod_barr_artic: string;
    en_pedido: number;                 // lo que trae este pedido
    existencia: number;                // existencia de la sucursal (PolyDB)
    minimo: number;
    maximo: number;
    en_rem: number;                    // traslados que ya se fueron a PolyDB y la sucursal no recibe
    otros_pedidos: number;             // pedido en otros pedidos de la sucursal
    ventas_esperadas: number;          // lo que se espera vender en los días que cubre este envío
    necesario: number;                 // ventas esperadas con la seguridad aplicada
    sugerido: number;                  // lo que falta para cubrirlo
    sugerido_por_maximo: number;       // lo que sugeriría el máximo actual de PolyDB (para comparar)
    disponible_almacen: number;
}

// Días que tiene que cubrir un envío: desde el día en que se cuenta el stock hasta el día anterior a la SIGUIENTE llegada
// (viernes → llega el sábado y la siguiente llegada es el martes: cubre viernes, sábado, domingo y lunes)
export function diasQueCubre(diaEnvio: number): number[] {
    const llegada = (diaEnvio + 1) % 7;
    let siguiente = llegada;
    for (let k = 1; k <= 7; k++) {
        const d = (llegada + k) % 7;
        if (DIAS_LLEGADA.includes(d)) { siguiente = d; break; }
    }
    const cuantos = ((siguiente - diaEnvio + 7) % 7) || 7;
    return Array.from({ length: cuantos }, (_, i) => (diaEnvio + i) % 7);
}

// Próximo día de envío a partir de hoy (hoy cuenta)
export function proximoDiaEnvio(desde = new Date()): number {
    for (let k = 0; k < 7; k++) {
        const d = (desde.getDay() + k) % 7;
        if (DIAS_ENVIO.includes(d)) return d;
    }
    return DIAS_ENVIO[0];
}

interface Sucursal {
    empPoly: number;
    nombre: string;
    ventas: Map<number, { porDia: number[]; dias: number }>;
    rem: Map<number, { pz: number; folios: string }>;
    almacen: Map<number, { existencia: number; minimo: number; maximo: number }>;
}

async function cargarSucursal(empPoly: number, codsExtra: number[]): Promise<Sucursal> {
    const [ventas, rem, nombre] = await Promise.all([
        dbPoly.query<any>(`
            SELECT m.artcdartn::int AS art, EXTRACT(DOW FROM m.kdxfechad::date)::int AS dow,
                   COALESCE(SUM(m.kdxcantin), 0)::float AS pz, COUNT(DISTINCT m.kdxfechad::date)::int AS dias
            FROM public.kardex m
            WHERE m.empcdempn = :emp AND TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
              AND m.kdxfechad::date >= CURRENT_DATE - :ventana::int AND m.kdxfechad::date < CURRENT_DATE
            GROUP BY 1, 2
        `, { replacements: { emp: empPoly, ventana: VENTANA_DIAS }, type: QueryTypes.SELECT }) as Promise<any[]>,
        dbPoly.query<any>(`
            SELECT d.artcdartn::int AS art, COALESCE(SUM(d.rmecanfan), 0)::float AS pz, STRING_AGG(DISTINCT h.rmenufacc, ', ') AS folios
            FROM public.rme0010 h
            JOIN public.rme00101 d ON d.empcdempn = h.empcdempn AND d.rmenufacc = h.rmenufacc
            WHERE h.empcdempn = :emp AND h.rmenufacc LIKE 'TRA-%' AND TRIM(h.rmestatuc) IN (:status)
              AND h.rmefecfad >= CURRENT_DATE - :dias::int
            GROUP BY 1
        `, { replacements: { emp: empPoly, status: STATUS_REM_PENDIENTE, dias: DIAS_REM }, type: QueryTypes.SELECT }) as Promise<any[]>,
        dbLocal.query<any>(
            `SELECT nom_empre FROM empresa_sucursal WHERE TRIM(id_empresa_sys_anterior::text) = CAST(:emp AS text) LIMIT 1`,
            { replacements: { emp: empPoly }, type: QueryTypes.SELECT }) as Promise<any[]>,
    ]);

    const mapaVentas = new Map<number, { porDia: number[]; dias: number }>();
    for (const v of ventas) {
        const art = Number(v.art);
        const acum = mapaVentas.get(art) ?? { porDia: [0, 0, 0, 0, 0, 0, 0], dias: 0 };
        acum.porDia[Number(v.dow)] += Math.max(0, num(v.pz));
        acum.dias += num(v.dias);
        mapaVentas.set(art, acum);
    }
    const mapaRem = new Map<number, { pz: number; folios: string }>();
    for (const r of rem) mapaRem.set(Number(r.art), { pz: num(r.pz), folios: String(r.folios ?? '') });

    // Existencia, mínimo y máximo de la sucursal de todo lo que importa (ventas, traslados y renglones del pedido)
    const cods = Array.from(new Set<number>([...mapaVentas.keys(), ...mapaRem.keys(), ...codsExtra]));
    const mapaAlmacen = new Map<number, { existencia: number; minimo: number; maximo: number }>();
    for (let i = 0; i < cods.length; i += 1000) {
        const lote = cods.slice(i, i + 1000);
        const filas = await dbPoly.query<any>(`
            SELECT artcdartn::int AS art, COALESCE(almexistn, 0)::float AS existencia,
                   COALESCE(almminpzn, 0)::float AS minimo, COALESCE(almmaxpzn, 0)::float AS maximo
            FROM public.almacenes1
            WHERE empcdempn = :emp AND almcdalmn = 1 AND artcdartn IN (:cods)
        `, { replacements: { emp: empPoly, cods: lote }, type: QueryTypes.SELECT }) as any[];
        for (const f of filas) mapaAlmacen.set(Number(f.art), { existencia: num(f.existencia), minimo: num(f.minimo), maximo: num(f.maximo) });
    }

    return { empPoly, nombre: String(nombre?.[0]?.nom_empre ?? '').trim(), ventas: mapaVentas, rem: mapaRem, almacen: mapaAlmacen };
}

export const CalculoNecesariosService = {

    calcular: async (id_empresa: string, opts: { ids_pedidos: string[]; dia_envio?: number; seguridad_pct?: number }) => {
        const ids = Array.from(new Set((opts.ids_pedidos ?? []).map(String))).slice(0, 60);
        if (!ids.length) throw { status: 400, message: 'No hay pedidos para calcular.' };

        const diaEnvio = Number.isInteger(opts.dia_envio) && DIAS_ENVIO.includes(opts.dia_envio as number)
            ? (opts.dia_envio as number) : proximoDiaEnvio();
        const seguridad = Math.min(100, Math.max(0, Number.isFinite(opts.seguridad_pct) ? (opts.seguridad_pct as number) : 20));
        const dias = diasQueCubre(diaEnvio);

        const pedidos = await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.status_pedido_alm,
                   ca.id_empresa_sys_anterior AS emp_poly, ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm
            FROM pedido_almacen pa
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE pa.id_pedido_alm IN (:ids)
            ORDER BY pa.cod_int_pedido_alm
        `, { replacements: { ids }, type: QueryTypes.SELECT }) as any[];

        // Renglones de todos los pedidos de una vez
        const renglones = await dbLocal.query<any>(`
            SELECT dpa.id_pedido_almacen AS id_pedido, dpa.id_articulo, a.cod_int_artic, a.des_artic, a.cod_barr_artic,
                   SUM(dpa.cant_pedida) AS cant
            FROM detalle_pedido_almacen dpa
            JOIN articulo a ON a.id_artic = dpa.id_articulo
            WHERE dpa.id_pedido_almacen IN (:ids)
            GROUP BY dpa.id_pedido_almacen, dpa.id_articulo, a.cod_int_artic, a.des_artic, a.cod_barr_artic
        `, { replacements: { ids }, type: QueryTypes.SELECT }) as any[];

        // Cada sucursal se carga una sola vez aunque tenga varios pedidos
        const empPolys = Array.from(new Set(pedidos.filter(p => p.emp_poly != null).map(p => Number(p.emp_poly))));
        const sucursales = new Map<number, Sucursal>();
        await Promise.all(empPolys.map(async emp => {
            const codsPedido = renglones
                .filter(r => pedidos.some(p => p.id_pedido_alm === r.id_pedido && Number(p.emp_poly) === emp))
                .map(r => Number(r.cod_int_artic));
            sucursales.set(emp, await cargarSucursal(emp, codsPedido));
        }));

        const resultado: any[] = [];
        for (const p of pedidos) {
            const base = {
                id_pedido_alm: p.id_pedido_alm as string,
                cod_pedido: p.cod_int_pedido_alm as string,
                status: p.status_pedido_alm as string,
                cliente: String(p.nom_corto_cliente_alm ?? '').trim() || String(p.razon_social_cliente_alm ?? '').trim() || '—',
            };
            if (!STATUS_CALCULABLES.includes(p.status_pedido_alm)) {
                resultado.push({ ...base, omitido: 'Solo se calculan pedidos en captura, cotización o capturados.' });
                continue;
            }
            if (p.emp_poly == null || !sucursales.has(Number(p.emp_poly))) {
                resultado.push({ ...base, omitido: 'El cliente no es una sucursal con sistema anterior (no tiene existencia en PolyDB).' });
                continue;
            }
            const suc = sucursales.get(Number(p.emp_poly)) as Sucursal;
            const lineasPedido = renglones.filter(r => r.id_pedido === p.id_pedido_alm);

            // Lo que la sucursal ya tiene pedido en OTROS pedidos (capturados, surtiendo, por checar o empacados sin facturar)
            const otros = await dbLocal.query<any>(`
                SELECT a.cod_int_artic, SUM(dpa.cant_pedida) AS pz
                FROM pedido_almacen pa
                JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
                JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = pa.id_pedido_alm
                JOIN articulo a ON a.id_artic = dpa.id_articulo
                WHERE ca.id_empresa_sys_anterior = :emp AND pa.id_pedido_alm <> :id
                  AND pa.status_pedido_alm IN (:status) AND pa.fecha_facturado_pedido_alm IS NULL
                GROUP BY a.cod_int_artic
            `, { replacements: { emp: suc.empPoly, id: p.id_pedido_alm, status: STATUS_COMPROMETIDOS }, type: QueryTypes.SELECT }) as any[];
            const otrosPorCod = new Map<number, number>(otros.map(o => [Number(o.cod_int_artic), num(o.pz)]));

            // Artículos a evaluar: los del pedido y los que la sucursal vende y podrían quedarse cortos aunque no vengan en el pedido
            const codsPedido = new Set<number>(lineasPedido.map(r => Number(r.cod_int_artic)));
            const candidatos = new Set<number>(codsPedido);
            Array.from(suc.ventas.entries()).forEach(([cod, v]) => { if (v.dias >= MIN_DIAS_CON_VENTA) candidatos.add(cod); });

            // Datos del artículo (los que no vienen en el pedido se buscan en el catálogo)
            const infoArt = new Map<number, { id: string; des: string; barras: string }>();
            for (const r of lineasPedido) infoArt.set(Number(r.cod_int_artic), { id: r.id_articulo, des: String(r.des_artic ?? '').trim(), barras: String(r.cod_barr_artic ?? '').trim() });
            const faltanInfo = Array.from(candidatos).filter(c => !infoArt.has(c));
            for (let i = 0; i < faltanInfo.length; i += 1000) {
                const filas = await dbLocal.query<any>(
                    `SELECT id_artic, cod_int_artic, des_artic, cod_barr_artic FROM articulo WHERE cod_int_artic IN (:cods)`,
                    { replacements: { cods: faltanInfo.slice(i, i + 1000) }, type: QueryTypes.SELECT }) as any[];
                for (const f of filas) infoArt.set(Number(f.cod_int_artic), { id: f.id_artic, des: String(f.des_artic ?? '').trim(), barras: String(f.cod_barr_artic ?? '').trim() });
            }

            // Disponible en el almacén (existencia menos apartada) de lo que se evalúa
            const idsArt = Array.from(candidatos).map(c => infoArt.get(c)?.id).filter(Boolean) as string[];
            const dispPorId = new Map<string, number>();
            for (let i = 0; i < idsArt.length; i += 1000) {
                const filas = await dbLocal.query<any>(`
                    SELECT id_articulo, COALESCE(SUM(GREATEST(cantidad - COALESCE(cantidad_apartada, 0), 0)), 0) AS disponible
                    FROM stock_ubicacion_lote
                    WHERE id_empresa_sucursal IN (
                        SELECT e.id_empre FROM empresa_sucursal e
                        WHERE e.idgrup_empre = (SELECT idgrup_empre FROM empresa_sucursal WHERE id_empre = :emp) OR e.id_empre = :emp
                    ) AND id_articulo IN (:ids)
                    GROUP BY id_articulo
                `, { replacements: { emp: id_empresa, ids: idsArt.slice(i, i + 1000) }, type: QueryTypes.SELECT }) as any[];
                for (const f of filas) dispPorId.set(f.id_articulo, num(f.disponible));
            }

            const filaDe = (cod: number): FilaNecesario => {
                const info = infoArt.get(cod);
                const alm = suc.almacen.get(cod) ?? { existencia: 0, minimo: 0, maximo: 0 };
                const vta = suc.ventas.get(cod);
                const enRem = suc.rem.get(cod)?.pz ?? 0;
                const otrosPz = otrosPorCod.get(cod) ?? 0;
                // Ventas esperadas: promedio de ese día de la semana en las últimas 12 semanas, sumado por cada día que cubre el envío
                const esperadas = vta ? dias.reduce((s, d) => s + vta.porDia[d] / SEMANAS_VENTANA, 0) : 0;
                const necesario = Math.ceil(esperadas * (1 + seguridad / 100));
                const cubierto = alm.existencia + enRem + otrosPz;
                return {
                    id_articulo: info?.id ?? null,
                    cod_int_artic: cod,
                    des_artic: info?.des ?? `Artículo ${cod}`,
                    cod_barr_artic: info?.barras ?? '',
                    en_pedido: num(lineasPedido.find(r => Number(r.cod_int_artic) === cod)?.cant),
                    existencia: alm.existencia,
                    minimo: alm.minimo,
                    maximo: alm.maximo,
                    en_rem: enRem,
                    otros_pedidos: otrosPz,
                    ventas_esperadas: Math.round(esperadas * 10) / 10,
                    necesario,
                    sugerido: Math.max(0, necesario - cubierto),
                    sugerido_por_maximo: alm.maximo > 0 ? Math.max(0, Math.ceil(alm.maximo - cubierto)) : 0,
                    disponible_almacen: info?.id ? (dispPorId.get(info.id) ?? 0) : 0,
                };
            };

            const lineas = Array.from(codsPedido).map(filaDe)
                .sort((a, b) => a.des_artic.localeCompare(b.des_artic, 'es'));
            // Lo que no viene en el pedido pero se vende y la sucursal se quedaría corta
            const faltantes = Array.from(candidatos).filter(c => !codsPedido.has(c)).map(filaDe)
                .filter(f => f.sugerido > 0 && f.id_articulo)
                .sort((a, b) => b.sugerido - a.sugerido)
                .slice(0, MAX_FALTANTES);

            resultado.push({
                ...base,
                sucursal: suc.nombre,
                emp_poly: suc.empPoly,
                // Cada folio una sola vez (venía repetido por cada artículo del traslado)
                rem_folios: Array.from(new Set(Array.from(suc.rem.values()).flatMap(r => r.folios.split(', ').map(x => x.trim())).filter(Boolean))).sort().join(', '),
                lineas,
                faltantes,
                resumen: {
                    renglones: lineas.length,
                    pz_pedidas: lineas.reduce((s, l) => s + l.en_pedido, 0),
                    pz_sugeridas_en_pedido: lineas.reduce((s, l) => s + l.sugerido, 0),
                    renglones_cortos: lineas.filter(l => l.sugerido > l.en_pedido).length,
                    renglones_de_sobra: lineas.filter(l => l.en_pedido > l.sugerido).length,
                    faltantes: faltantes.length,
                    pz_faltantes: faltantes.reduce((s, f) => s + f.sugerido, 0),
                },
            });
        }

        return {
            dia_envio: diaEnvio,
            dia_envio_nombre: NOMBRES_DIA[diaEnvio],
            cubre: dias.map(d => NOMBRES_DIA[d]),
            seguridad_pct: seguridad,
            ventana_dias: VENTANA_DIAS,
            pedidos: resultado,
        };
    },
};
