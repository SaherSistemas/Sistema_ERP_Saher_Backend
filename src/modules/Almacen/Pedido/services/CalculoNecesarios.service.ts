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

// Método: para cada artículo se mide cuánto se vendió en los mismos días que cubre este envío, semana por semana, durante las
// últimas HISTORIA_SEMANAS semanas. El necesario es el valor que cubrió el "nivel de servicio" de esas semanas (cuantil), no un
// promedio más un porcentaje. Los artículos de venta ocasional usan un nivel menor porque asegurarlos cuesta mucho inventario parado.
const HISTORIA_SEMANAS = 26;
const VENTANA_DIAS = HISTORIA_SEMANAS * 7;
const NIVEL_SERVICIO_DEFECTO = 95;        // % de las semanas que debe cubrir el necesario en artículos de rotación
const MENOS_NIVEL_OCASIONAL = 5;          // puntos menos para artículos que se venden en pocas semanas
const FRACCION_ROTACION = 0.42;           // a partir de esta fracción de semanas con venta se considera de rotación
const MIN_SEMANAS_CON_VENTA = 5;          // para sugerir un artículo que NO viene en el pedido
const MIN_SEMANAS_REABASTO = 3;            // para incluir un artículo en el reabasto de una sucursal (no parte de ningún pedido)
const STATUS_REM_PENDIENTE = ['C'];       // recibo de PolyDB capturado y aún sin recibir en la sucursal
const DIAS_REM = 7;
const STATUS_COMPROMETIDOS = ['CA', 'SU', 'CH', 'EM'];   // otros pedidos de la sucursal que ya están pedidos y sin facturar
const ESTADO_PEDIDO: Record<string, string> = { CA: 'capturado', SU: 'surtiendo', CH: 'por checar', EM: 'empacado' };
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
    en_rem_detalle: { folio: string; pz: number }[];   // cuáles traslados son
    otros_pedidos: number;             // pedido en otros pedidos de la sucursal
    otros_pedidos_detalle: { cod_pedido: string; estado: string; pz: number }[];   // cuáles pedidos son
    ventas_esperadas: number;          // promedio vendido por semana en los días que cubre este envío
    sem_con_venta: number;             // en cuántas de las últimas semanas se vendió algo en esos días
    necesario: number;                 // lo que cubrió el nivel de servicio de esas semanas
    sugerido: number;                  // lo que falta para cubrirlo
    nuevo_solicitado: number;          // lo que pediría el sistema nuevo: el sugerido, sin pasar de lo que hay disponible en el almacén
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

// Fecha (YYYY-MM-DD) del próximo envío que cae en ese día de la semana (hoy cuenta)
export function fechaProximoEnvio(diaEnvio: number, desde = new Date()): string {
    const f = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    f.setDate(f.getDate() + ((diaEnvio - f.getDay() + 7) % 7));
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

// Cuantil sobre los valores semanales (el valor más chico que cubre al menos esa fracción de las semanas)
function cuantil(valores: number[], q: number): number {
    if (!valores.length) return 0;
    const orden = [...valores].sort((a, b) => a - b);
    const k = Math.min(orden.length - 1, Math.max(0, Math.ceil(q * orden.length - 1e-9) - 1));
    return orden[k];
}

interface Sucursal {
    empPoly: number;
    nombre: string;
    demanda: Map<number, number[]>;   // por artículo: lo vendido en la ventana del envío, una cifra por semana (la 0 es la más reciente)
    rem: Map<number, { pz: number; detalle: { folio: string; pz: number }[] }>;
    almacen: Map<number, { existencia: number; minimo: number; maximo: number }>;
}

async function cargarSucursal(empPoly: number, codsExtra: number[], fechaEnvio: string, nDias: number): Promise<Sucursal> {
    const [ventas, rem, nombre] = await Promise.all([
        // Semana w (1 = la más reciente) = los mismos nDias días que cubre el envío, w semanas antes de la fecha del envío
        dbPoly.query<any>(`
            SELECT m.artcdartn::int AS art, ((CAST(:envio AS date) - m.kdxfechad::date - 1) / 7 + 1)::int AS w,
                   GREATEST(COALESCE(SUM(m.kdxcantin), 0), 0)::float AS pz
            FROM public.kardex m
            WHERE m.empcdempn = :emp AND TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
              AND m.kdxfechad::date >= CAST(:envio AS date) - :ventana::int
              AND m.kdxfechad::date < LEAST(CAST(:envio AS date), CURRENT_DATE)
              AND (((CAST(:envio AS date) - m.kdxfechad::date - 1) % 7) + 1) > (7 - :ndias::int)
            GROUP BY 1, 2
        `, { replacements: { emp: empPoly, envio: fechaEnvio, ventana: VENTANA_DIAS, ndias: nDias }, type: QueryTypes.SELECT }) as Promise<any[]>,
        dbPoly.query<any>(`
            SELECT d.artcdartn::int AS art, TRIM(h.rmenufacc) AS folio, COALESCE(SUM(d.rmecanfan), 0)::float AS pz
            FROM public.rme0010 h
            JOIN public.rme00101 d ON d.empcdempn = h.empcdempn AND d.rmenufacc = h.rmenufacc
            WHERE h.empcdempn = :emp AND h.rmenufacc LIKE 'TRA-%' AND TRIM(h.rmestatuc) IN (:status)
              AND h.rmefecfad >= CURRENT_DATE - :dias::int
            GROUP BY 1, 2
        `, { replacements: { emp: empPoly, status: STATUS_REM_PENDIENTE, dias: DIAS_REM }, type: QueryTypes.SELECT }) as Promise<any[]>,
        dbLocal.query<any>(
            `SELECT nom_empre FROM empresa_sucursal WHERE TRIM(id_empresa_sys_anterior::text) = CAST(:emp AS text) LIMIT 1`,
            { replacements: { emp: empPoly }, type: QueryTypes.SELECT }) as Promise<any[]>,
    ]);

    const mapaVentas = new Map<number, number[]>();
    for (const v of ventas) {
        const w = Number(v.w);
        if (!(w >= 1 && w <= HISTORIA_SEMANAS)) continue;
        const art = Number(v.art);
        const semanas = mapaVentas.get(art) ?? new Array<number>(HISTORIA_SEMANAS).fill(0);
        semanas[w - 1] += Math.max(0, num(v.pz));
        mapaVentas.set(art, semanas);
    }
    const mapaRem = new Map<number, { pz: number; detalle: { folio: string; pz: number }[] }>();
    for (const r of rem) {
        const art = Number(r.art);
        const acum = mapaRem.get(art) ?? { pz: 0, detalle: [] };
        acum.pz += num(r.pz);
        acum.detalle.push({ folio: String(r.folio ?? '').trim(), pz: num(r.pz) });
        mapaRem.set(art, acum);
    }

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

    return { empPoly, nombre: String(nombre?.[0]?.nom_empre ?? '').trim(), demanda: mapaVentas, rem: mapaRem, almacen: mapaAlmacen };
}

type OtrosPorCod = Map<number, { pz: number; detalle: { cod_pedido: string; estado: string; pz: number }[] }>;
type InfoArt = Map<number, { id: string; des: string; barras: string }>;

// Lo que la sucursal ya tiene pedido en pedidos capturados, surtiendo, por checar o empacados sin facturar (menos el pedido `idExcluir`, si se da)
async function cargarOtrosPedidos(empPoly: number, idExcluir: string | null): Promise<OtrosPorCod> {
    const otros = await dbLocal.query<any>(`
        SELECT a.cod_int_artic, pa.cod_int_pedido_alm AS cod_pedido, pa.status_pedido_alm AS status, SUM(dpa.cant_pedida) AS pz
        FROM pedido_almacen pa
        JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
        JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = pa.id_pedido_alm
        JOIN articulo a ON a.id_artic = dpa.id_articulo
        WHERE ca.id_empresa_sys_anterior = :emp AND (CAST(:id AS text) IS NULL OR pa.id_pedido_alm::text <> CAST(:id AS text))
          AND pa.status_pedido_alm IN (:status) AND pa.fecha_facturado_pedido_alm IS NULL
        GROUP BY a.cod_int_artic, pa.cod_int_pedido_alm, pa.status_pedido_alm
        ORDER BY pa.cod_int_pedido_alm
    `, { replacements: { emp: empPoly, id: idExcluir, status: STATUS_COMPROMETIDOS }, type: QueryTypes.SELECT }) as any[];
    const porCod: OtrosPorCod = new Map();
    for (const o of otros) {
        const cod = Number(o.cod_int_artic);
        const acum = porCod.get(cod) ?? { pz: 0, detalle: [] };
        acum.pz += num(o.pz);
        acum.detalle.push({ cod_pedido: String(o.cod_pedido ?? '').trim(), estado: ESTADO_PEDIDO[o.status] ?? String(o.status), pz: num(o.pz) });
        porCod.set(cod, acum);
    }
    return porCod;
}

// Completa con el catálogo los datos de los artículos que todavía no se conocen
async function completarInfoArticulos(info: InfoArt, cods: number[]) {
    const faltan = cods.filter(c => !info.has(c));
    for (let i = 0; i < faltan.length; i += 1000) {
        const filas = await dbLocal.query<any>(
            `SELECT id_artic, cod_int_artic, des_artic, cod_barr_artic FROM articulo WHERE cod_int_artic IN (:cods)`,
            { replacements: { cods: faltan.slice(i, i + 1000) }, type: QueryTypes.SELECT }) as any[];
        for (const f of filas) info.set(Number(f.cod_int_artic), { id: f.id_artic, des: String(f.des_artic ?? '').trim(), barras: String(f.cod_barr_artic ?? '').trim() });
    }
}

// Disponible en el almacén (existencia menos apartada) de los artículos dados
async function cargarDisponibles(id_empresa: string, idsArt: string[]): Promise<Map<string, number>> {
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
    return dispPorId;
}

interface ContextoFila {
    suc: Sucursal;
    infoArt: InfoArt;
    otrosPorCod: OtrosPorCod;
    dispPorId: Map<string, number>;
    nivel: number;
    enPedido: Map<number, number>;
}

function filaNecesario(cod: number, c: ContextoFila): FilaNecesario {
    const info = c.infoArt.get(cod);
    const alm = c.suc.almacen.get(cod) ?? { existencia: 0, minimo: 0, maximo: 0 };
    const semanas = c.suc.demanda.get(cod);
    const enRem = c.suc.rem.get(cod)?.pz ?? 0;
    const otrosPz = c.otrosPorCod.get(cod)?.pz ?? 0;
    // Lo vendido en los días que cubre el envío, semana por semana. El necesario es lo que cubrió el nivel de servicio de
    // esas semanas: rotación → nivel completo; venta ocasional → 5 puntos menos (asegurarla deja mucho inventario parado)
    const semConVenta = semanas ? semanas.filter(x => x > 0).length : 0;
    const esperadas = semanas ? semanas.reduce((s, x) => s + x, 0) / HISTORIA_SEMANAS : 0;
    const nivelArt = semConVenta / HISTORIA_SEMANAS > FRACCION_ROTACION ? c.nivel : c.nivel - MENOS_NIVEL_OCASIONAL;
    const necesario = semanas && semConVenta > 0 ? Math.ceil(cuantil(semanas, nivelArt / 100)) : 0;
    const cubierto = alm.existencia + enRem + otrosPz;
    const sugerido = Math.max(0, necesario - cubierto);
    const disponible = info?.id ? (c.dispPorId.get(info.id) ?? 0) : 0;
    return {
        id_articulo: info?.id ?? null,
        cod_int_artic: cod,
        des_artic: info?.des ?? `Artículo ${cod}`,
        cod_barr_artic: info?.barras ?? '',
        en_pedido: c.enPedido.get(cod) ?? 0,
        existencia: alm.existencia,
        minimo: alm.minimo,
        maximo: alm.maximo,
        en_rem: enRem,
        en_rem_detalle: c.suc.rem.get(cod)?.detalle ?? [],
        otros_pedidos: otrosPz,
        otros_pedidos_detalle: c.otrosPorCod.get(cod)?.detalle ?? [],
        ventas_esperadas: Math.round(esperadas * 10) / 10,
        sem_con_venta: semConVenta,
        necesario,
        sugerido,
        nuevo_solicitado: Math.min(sugerido, disponible),
        sugerido_por_maximo: alm.maximo > 0 ? Math.max(0, Math.ceil(alm.maximo - cubierto)) : 0,
        disponible_almacen: disponible,
    };
}

export const CalculoNecesariosService = {

    calcular: async (id_empresa: string, opts: { ids_pedidos: string[]; dia_envio?: number; nivel_servicio?: number }) => {
        const ids = Array.from(new Set((opts.ids_pedidos ?? []).map(String))).slice(0, 60);
        if (!ids.length) throw { status: 400, message: 'No hay pedidos para calcular.' };

        const diaEnvio = Number.isInteger(opts.dia_envio) && DIAS_ENVIO.includes(opts.dia_envio as number)
            ? (opts.dia_envio as number) : proximoDiaEnvio();
        const nivel = Math.min(99, Math.max(50, Number.isFinite(opts.nivel_servicio) ? (opts.nivel_servicio as number) : NIVEL_SERVICIO_DEFECTO));
        const dias = diasQueCubre(diaEnvio);
        const fechaEnvio = fechaProximoEnvio(diaEnvio);

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
            sucursales.set(emp, await cargarSucursal(emp, codsPedido, fechaEnvio, dias.length));
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

            // Lo que la sucursal ya tiene pedido en OTROS pedidos
            const otrosPorCod = await cargarOtrosPedidos(suc.empPoly, p.id_pedido_alm);

            // Artículos a evaluar: los del pedido y los que la sucursal vende y podrían quedarse cortos aunque no vengan en el pedido
            const codsPedido = new Set<number>(lineasPedido.map(r => Number(r.cod_int_artic)));
            const candidatos = new Set<number>(codsPedido);
            Array.from(suc.demanda.entries()).forEach(([cod, semanas]) => {
                if (semanas.filter(x => x > 0).length >= MIN_SEMANAS_CON_VENTA) candidatos.add(cod);
            });

            // Datos del artículo (los que no vienen en el pedido se buscan en el catálogo)
            const infoArt: InfoArt = new Map();
            for (const r of lineasPedido) infoArt.set(Number(r.cod_int_artic), { id: r.id_articulo, des: String(r.des_artic ?? '').trim(), barras: String(r.cod_barr_artic ?? '').trim() });
            await completarInfoArticulos(infoArt, Array.from(candidatos));

            const dispPorId = await cargarDisponibles(id_empresa, Array.from(candidatos).map(c => infoArt.get(c)?.id).filter(Boolean) as string[]);
            const enPedido = new Map<number, number>(lineasPedido.map(r => [Number(r.cod_int_artic), num(r.cant)] as [number, number]));
            const filaDe = (cod: number): FilaNecesario => filaNecesario(cod, { suc, infoArt, otrosPorCod, dispPorId, nivel, enPedido });

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
                rem_folios: Array.from(new Set(Array.from(suc.rem.values()).flatMap(r => r.detalle.map(d => d.folio)).filter(Boolean))).sort().join(', '),
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
            nivel_servicio: nivel,
            historia_semanas: HISTORIA_SEMANAS,
            ventana_dias: VENTANA_DIAS,
            pedidos: resultado,
        };
    },

    // Sucursales (clientes con existencia en PolyDB) para las que se puede calcular un reabasto
    sucursales: async () => {
        const filas = await dbLocal.query<any>(`
            SELECT id_cliente_alm, nom_corto_cliente_alm, razon_social_cliente_alm, id_empresa_sys_anterior AS emp_poly
            FROM cliente_almacen
            WHERE id_empresa_sys_anterior IS NOT NULL
        `, { type: QueryTypes.SELECT }) as any[];
        return filas
            .map(c => ({
                id_cliente_alm: c.id_cliente_alm as string,
                nombre: String(c.nom_corto_cliente_alm ?? '').trim() || String(c.razon_social_cliente_alm ?? '').trim() || '—',
                emp_poly: Number(c.emp_poly),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },

    // Lo que cada sucursal debería pedir, SIN partir de ningún pedido que hayan hecho: todo artículo que la sucursal vende con
    // regularidad, necesario menos (existencia + en camino + lo que ya está en cualquiera de sus pedidos sin facturar).
    reabasto: async (id_empresa: string, opts: { ids_clientes: string[]; dia_envio?: number; nivel_servicio?: number }) => {
        const ids = Array.from(new Set((opts.ids_clientes ?? []).map(String))).slice(0, 40);
        if (!ids.length) throw { status: 400, message: 'Elige al menos una sucursal.' };

        const diaEnvio = Number.isInteger(opts.dia_envio) && DIAS_ENVIO.includes(opts.dia_envio as number)
            ? (opts.dia_envio as number) : proximoDiaEnvio();
        const nivel = Math.min(99, Math.max(50, Number.isFinite(opts.nivel_servicio) ? (opts.nivel_servicio as number) : NIVEL_SERVICIO_DEFECTO));
        const dias = diasQueCubre(diaEnvio);
        const fechaEnvio = fechaProximoEnvio(diaEnvio);

        const clientes = await dbLocal.query<any>(`
            SELECT id_cliente_alm, nom_corto_cliente_alm, razon_social_cliente_alm, id_empresa_sys_anterior AS emp_poly
            FROM cliente_almacen
            WHERE id_cliente_alm IN (:ids) AND id_empresa_sys_anterior IS NOT NULL
        `, { replacements: { ids }, type: QueryTypes.SELECT }) as any[];

        const sucursales: any[] = [];
        for (const c of clientes) {
            const suc = await cargarSucursal(Number(c.emp_poly), [], fechaEnvio, dias.length);
            const otrosPorCod = await cargarOtrosPedidos(suc.empPoly, null);

            const candidatos = Array.from(suc.demanda.entries())
                .filter(([, semanas]) => semanas.filter(x => x > 0).length >= MIN_SEMANAS_REABASTO)
                .map(([cod]) => cod);
            const infoArt: InfoArt = new Map();
            await completarInfoArticulos(infoArt, candidatos);
            const dispPorId = await cargarDisponibles(id_empresa, candidatos.map(cod => infoArt.get(cod)?.id).filter(Boolean) as string[]);
            const ctx: ContextoFila = { suc, infoArt, otrosPorCod, dispPorId, nivel, enPedido: new Map() };

            const lineas = candidatos.map(cod => filaNecesario(cod, ctx))
                .filter(f => f.sugerido > 0 && f.id_articulo)
                .sort((a, b) => a.des_artic.localeCompare(b.des_artic, 'es'));

            sucursales.push({
                id_cliente_alm: c.id_cliente_alm as string,
                sucursal: String(c.nom_corto_cliente_alm ?? '').trim() || String(c.razon_social_cliente_alm ?? '').trim() || suc.nombre || '—',
                emp_poly: suc.empPoly,
                rem_folios: Array.from(new Set(Array.from(suc.rem.values()).flatMap(r => r.detalle.map(d => d.folio)).filter(Boolean))).sort().join(', '),
                lineas,
                resumen: {
                    renglones: lineas.length,
                    pz_sugeridas: lineas.reduce((t, l) => t + l.sugerido, 0),
                    pz_solicitadas: lineas.reduce((t, l) => t + l.nuevo_solicitado, 0),
                    renglones_sin_almacen: lineas.filter(l => l.nuevo_solicitado < l.sugerido).length,
                },
            });
        }
        sucursales.sort((a, b) => a.sucursal.localeCompare(b.sucursal, 'es'));

        return {
            dia_envio: diaEnvio,
            dia_envio_nombre: NOMBRES_DIA[diaEnvio],
            cubre: dias.map(d => NOMBRES_DIA[d]),
            nivel_servicio: nivel,
            historia_semanas: HISTORIA_SEMANAS,
            sucursales,
        };
    },
};
