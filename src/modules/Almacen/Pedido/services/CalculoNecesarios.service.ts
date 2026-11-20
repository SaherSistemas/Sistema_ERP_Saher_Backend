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
// Ritmo de venta de una sucursal por artículo (reporte de sobrante):
//  · solo cuentan los días en que el artículo tuvo existencia (agotado no se puede vender), y con un piso de días
//    para que dos ventas sueltas no den un ritmo exagerado;
//  · si lo reciente se dispara contra su propio historial anterior (un "pico": una compra grande, un cliente, una
//    entrada nueva después de meses agotado), no se proyecta tal cual: se mezcla con ese historial según qué tanta
//    historia reciente hay (credibilidad completa con CRED_DIAS días con existencia).
const MIN_DIAS_DISPONIBLE = 14;
const HISTORIA_LARGA_DIAS = 730;         // hasta dónde se mira el historial anterior
const CRED_DIAS = 42;                    // días con existencia (6 semanas) para fiarse por completo de lo reciente
const MIN_DIAS_BASE = 28;                // días con existencia anteriores mínimos para tener historial de referencia
const FACTOR_PICO = 3;                   // lo reciente ≥ 3 veces su historial = pico
const MIN_PZ_PICO = 10;                  // y al menos estas piezas vendidas en lo reciente

// eventos: movimientos por día de los últimos HISTORIA_LARGA_DIAS (dia = número de día), ordenados por día;
// delta = efecto neto en la existencia (entrada +, salida −). Separa lo reciente (últimos VENTANA_DIAS) de lo anterior.
function disponibilidad(existenciaActual: number, eventos: { dia: number; delta: number; vendido: number }[], hoy: number) {
    const inicio = hoy - HISTORIA_LARGA_DIAS;
    const corte = hoy - VENTANA_DIAS - 1;                                                   // reciente = días > corte
    let saldo = Math.max(0, existenciaActual - eventos.reduce((t, e) => t + e.delta, 0));  // saldo al empezar el historial
    let cursor = inicio;
    let dispRec = 0, dispAnt = 0, vendRec = 0, vendAnt = 0;
    const tramo = (desde: number, hasta: number) => {                                       // días [desde, hasta] con existencia
        if (hasta < desde) return;
        const ant = Math.max(0, Math.min(hasta, corte) - desde + 1);
        dispAnt += ant;
        dispRec += (hasta - desde + 1) - ant;
    };
    for (const e of eventos) {
        if (saldo > 0) tramo(cursor, e.dia - 1);
        if (saldo > 0 || e.vendido > 0) { if (e.dia <= corte) dispAnt += 1; else dispRec += 1; }   // el día del movimiento
        if (e.dia <= corte) vendAnt += e.vendido; else vendRec += e.vendido;
        saldo += e.delta;
        cursor = e.dia + 1;
    }
    if (saldo > 0) tramo(cursor, hoy);
    return { dispRec, dispAnt, vendRec, vendAnt };
}
const numeroDeDia = (aaaammdd: string) => Math.floor(Date.UTC(+aaaammdd.slice(0, 4), +aaaammdd.slice(5, 7) - 1, +aaaammdd.slice(8, 10)) / 86_400_000);
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
const DIAS_SOBREEXISTENCIA = 60;          // una sucursal "se pasa" cuando lo que tiene ya cubre más de estos días de venta
const MIN_PZ_SOBRANTE = 2;                // no se listan sobrantes de 1 pieza
const MAX_SOBREEXISTENCIA = 500;          // renglones máximos por sucursal en la respuesta

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

// Días que cubre un envío: desde el día SIGUIENTE a la llegada hasta el día de la SIGUIENTE llegada (inclusive).
//   envío lunes     → llega el martes    → cubre miércoles y jueves
//   envío miércoles → llega el jueves    → cubre viernes y sábado
//   envío viernes   → llega el sábado    → cubre domingo, lunes y martes
// Los días de la semana que cubre empiezan DESFASE_COBERTURA días después del día del envío (llegada + 1).
const DESFASE_COBERTURA = 2;
export function diasQueCubre(diaEnvio: number): number[] {
    const llegada = (diaEnvio + 1) % 7;
    let siguiente = llegada;
    for (let k = 1; k <= 7; k++) {
        const d = (llegada + k) % 7;
        if (DIAS_LLEGADA.includes(d)) { siguiente = d; break; }
    }
    const cuantos = ((siguiente - llegada + 7) % 7) || 7;
    return Array.from({ length: cuantos }, (_, i) => (llegada + 1 + i) % 7);
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
        // Semana w (1 = la más reciente) = los mismos nDias días que cubre el envío (miércoles y jueves en un envío del lunes),
        // w semanas antes de la fecha del envío
        dbPoly.query<any>(`
            SELECT m.artcdartn::int AS art, ((CAST(:envio AS date) - m.kdxfechad::date - 1) / 7 + 1)::int AS w,
                   GREATEST(COALESCE(SUM(m.kdxcantin), 0), 0)::float AS pz
            FROM public.kardex m
            WHERE m.empcdempn = :emp AND TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
              AND m.kdxfechad::date >= CAST(:envio AS date) - :ventana::int
              AND m.kdxfechad::date < LEAST(CAST(:envio AS date), CURRENT_DATE)
              AND (((CAST(:envio AS date) - m.kdxfechad::date - 1) % 7) + 1) BETWEEN :kmin AND :kmax
            GROUP BY 1, 2
        `, {
            // k = 7 es el mismo día de la semana que el envío, 6 el siguiente, etc. Los días que cubre empiezan DESFASE_COBERTURA días
            // después del envío (llegada + 1) y duran nDias
            replacements: { emp: empPoly, envio: fechaEnvio, ventana: VENTANA_DIAS, kmin: 7 - (DESFASE_COBERTURA + nDias - 1), kmax: 7 - DESFASE_COBERTURA },
            type: QueryTypes.SELECT,
        }) as Promise<any[]>,
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

// Artículos que el almacén ALGUNA VEZ ha manejado (tienen o tuvieron existencia o algún movimiento en el Kardex en las empresas
// del grupo). Los que las sucursales venden pero el almacén nunca ha tenido (dulcería, abarrotes…) no se pueden resurtir desde
// aquí, así que por defecto se ocultan de las sugerencias.
async function cargarManejadosAlmacen(id_empresa: string, idsArt: string[]): Promise<Set<string>> {
    const manejados = new Set<string>();
    for (let i = 0; i < idsArt.length; i += 1000) {
        const filas = await dbLocal.query<any>(`
            WITH grupo AS (
                SELECT e.id_empre FROM empresa_sucursal e
                WHERE e.idgrup_empre = (SELECT idgrup_empre FROM empresa_sucursal WHERE id_empre = :emp) OR e.id_empre = :emp
            )
            SELECT DISTINCT t.id_articulo FROM (
                SELECT s.id_articulo FROM stock_ubicacion_lote s
                WHERE s.id_empresa_sucursal IN (SELECT id_empre FROM grupo) AND s.id_articulo IN (:ids)
                UNION
                SELECT k.id_articulo FROM kardex_movimientos_articulos k
                WHERE k.id_empresa IN (SELECT id_empre FROM grupo) AND k.id_articulo IN (:ids)
            ) t
        `, { replacements: { emp: id_empresa, ids: idsArt.slice(i, i + 1000) }, type: QueryTypes.SELECT }) as any[];
        for (const f of filas) manejados.add(String(f.id_articulo));
    }
    return manejados;
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

    calcular: async (id_empresa: string, opts: { ids_pedidos: string[]; dia_envio?: number; nivel_servicio?: number; incluir_no_manejados?: boolean }) => {
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
            const faltantesTodos = Array.from(candidatos).filter(c => !codsPedido.has(c)).map(filaDe)
                .filter(f => f.sugerido > 0 && f.id_articulo);
            // Se ocultan los que el almacén nunca ha manejado (no se pueden surtir desde aquí), salvo que se pidan
            const manejados = opts.incluir_no_manejados ? null : await cargarManejadosAlmacen(id_empresa, faltantesTodos.map(f => f.id_articulo as string));
            const faltantes = faltantesTodos
                .filter(f => !manejados || manejados.has(f.id_articulo as string))
                .sort((a, b) => b.sugerido - a.sugerido)
                .slice(0, MAX_FALTANTES);
            const faltantes_ocultos = faltantesTodos.length - (manejados ? faltantesTodos.filter(f => manejados.has(f.id_articulo as string)).length : faltantesTodos.length);

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
                    faltantes_ocultos,
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
    reabasto: async (id_empresa: string, opts: { ids_clientes: string[]; dia_envio?: number; nivel_servicio?: number; incluir_no_manejados?: boolean }) => {
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

            const todas = candidatos.map(cod => filaNecesario(cod, ctx))
                .filter(f => f.sugerido > 0 && f.id_articulo);
            // Se ocultan los que el almacén nunca ha manejado (dulcería, abarrotes…): no se pueden surtir desde aquí, salvo que se pidan
            const manejados = opts.incluir_no_manejados ? null : await cargarManejadosAlmacen(id_empresa, todas.map(f => f.id_articulo as string));
            const lineas = todas
                .filter(f => !manejados || manejados.has(f.id_articulo as string))
                .sort((a, b) => a.des_artic.localeCompare(b.des_artic, 'es'));
            const ocultos_no_manejados = todas.length - lineas.length;

            // YA CUBIERTO CON PEDIDOS: artículos donde un pedido capturado (CA, SU, CH o EM, sin facturar) ya resuelve lo que hace falta,
            // por eso no salen arriba. Se ve cuánto faltaba (necesario − existencia − en camino) contra lo que trae el pedido:
            // diferencia 0 = cuadra; positiva = el pedido trae de más (también entran artículos del pedido que la sucursal casi no vende).
            const codsCubiertos = new Set<number>(candidatos);
            otrosPorCod.forEach((_v, cod) => codsCubiertos.add(cod));
            await completarInfoArticulos(infoArt, Array.from(codsCubiertos).filter(c => !infoArt.has(c)));
            const cubiertos = Array.from(codsCubiertos)
                .filter(cod => (otrosPorCod.get(cod)?.pz ?? 0) > 0)
                .map(cod => filaNecesario(cod, ctx))
                .filter(f => f.sugerido === 0)
                .map(f => {
                    const faltaba = Math.max(0, f.necesario - f.existencia - f.en_rem);
                    return { ...f, faltaba, diferencia: f.otros_pedidos - faltaba };
                })
                .sort((a, b) => b.diferencia - a.diferencia || a.des_artic.localeCompare(b.des_artic, 'es'));

            sucursales.push({
                id_cliente_alm: c.id_cliente_alm as string,
                sucursal: String(c.nom_corto_cliente_alm ?? '').trim() || String(c.razon_social_cliente_alm ?? '').trim() || suc.nombre || '—',
                emp_poly: suc.empPoly,
                rem_folios: Array.from(new Set(Array.from(suc.rem.values()).flatMap(r => r.detalle.map(d => d.folio)).filter(Boolean))).sort().join(', '),
                lineas,
                cubiertos,
                resumen: {
                    cubiertos: cubiertos.length,
                    cubiertos_de_mas: cubiertos.filter(f => f.diferencia > 0).length,
                    pz_de_mas: cubiertos.reduce((t, f) => t + Math.max(0, f.diferencia), 0),
                    renglones: lineas.length,
                    pz_sugeridas: lineas.reduce((t, l) => t + l.sugerido, 0),
                    pz_solicitadas: lineas.reduce((t, l) => t + l.nuevo_solicitado, 0),
                    renglones_sin_almacen: lineas.filter(l => l.nuevo_solicitado < l.sugerido).length,
                    ocultos_no_manejados,
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

    // Lo que cada sucursal tiene DE MÁS: artículos con existencia en PolyDB que ya cubren más de `dias_limite` días de venta
    // (al ritmo de las últimas HISTORIA_SEMANAS semanas, todos los días) o que no se han vendido en todo ese tiempo.
    // Sobrante = existencia − lo que se vendería en `dias_limite` días. Solo calcula.
    sobreexistencia: async (id_empresa: string, opts: { ids_clientes: string[]; dias_limite?: number; incluir_no_manejados?: boolean }) => {
        const ids = Array.from(new Set((opts.ids_clientes ?? []).map(String))).slice(0, 40);
        if (!ids.length) throw { status: 400, message: 'Elige al menos una sucursal.' };
        const diasLimite = Math.min(365, Math.max(7, Math.round(Number.isFinite(opts.dias_limite) ? (opts.dias_limite as number) : DIAS_SOBREEXISTENCIA)));

        const clientes = await dbLocal.query<any>(`
            SELECT id_cliente_alm, nom_corto_cliente_alm, razon_social_cliente_alm, id_empresa_sys_anterior AS emp_poly
            FROM cliente_almacen
            WHERE id_cliente_alm IN (:ids) AND id_empresa_sys_anterior IS NOT NULL
        `, { replacements: { ids }, type: QueryTypes.SELECT }) as any[];

        const sucursales: any[] = [];
        for (const c of clientes) {
            const empPoly = Number(c.emp_poly);
            const [existencias, ventas, rem, otrosPorCod, nombre, movimientos, ultimasEntradas] = await Promise.all([
                dbPoly.query<any>(`
                    SELECT artcdartn::int AS art, COALESCE(almexistn, 0)::float AS existencia,
                           COALESCE(almminpzn, 0)::float AS minimo, COALESCE(almmaxpzn, 0)::float AS maximo
                    FROM public.almacenes1
                    WHERE empcdempn = :emp AND almcdalmn = 1 AND COALESCE(almexistn, 0) > 0
                `, { replacements: { emp: empPoly }, type: QueryTypes.SELECT }) as Promise<any[]>,
                dbPoly.query<any>(`
                    SELECT m.artcdartn::int AS art, GREATEST(COALESCE(SUM(m.kdxcantin), 0), 0)::float AS pz
                    FROM public.kardex m
                    WHERE m.empcdempn = :emp AND TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
                      AND m.kdxfechad::date >= CURRENT_DATE - :ventana::int
                    GROUP BY 1
                `, { replacements: { emp: empPoly, ventana: VENTANA_DIAS }, type: QueryTypes.SELECT }) as Promise<any[]>,
                dbPoly.query<any>(`
                    SELECT d.artcdartn::int AS art, COALESCE(SUM(d.rmecanfan), 0)::float AS pz
                    FROM public.rme0010 h
                    JOIN public.rme00101 d ON d.empcdempn = h.empcdempn AND d.rmenufacc = h.rmenufacc
                    WHERE h.empcdempn = :emp AND h.rmenufacc LIKE 'TRA-%' AND TRIM(h.rmestatuc) IN (:status)
                      AND h.rmefecfad >= CURRENT_DATE - :dias::int
                    GROUP BY 1
                `, { replacements: { emp: empPoly, status: STATUS_REM_PENDIENTE, dias: DIAS_REM }, type: QueryTypes.SELECT }) as Promise<any[]>,
                cargarOtrosPedidos(empPoly, null),
                dbLocal.query<any>(
                    `SELECT nom_empre FROM empresa_sucursal WHERE TRIM(id_empresa_sys_anterior::text) = CAST(:emp AS text) LIMIT 1`,
                    { replacements: { emp: empPoly }, type: QueryTypes.SELECT }) as Promise<any[]>,
                // Movimientos por día de la ventana (entrada +, salida −) para saber cuántos días hubo existencia
                dbPoly.query<any>(`
                    SELECT m.artcdartn::int AS art, to_char(m.kdxfechad::date, 'YYYY-MM-DD') AS dia,
                           SUM(CASE WHEN COALESCE(NULLIF(TRIM(t.tmotpeosc), ''), LEFT(TRIM(m.tmocdtpoc), 1)) = 'E'
                                    THEN m.kdxcantin ELSE -m.kdxcantin END)::float AS delta,
                           SUM(CASE WHEN TRIM(UPPER(m.tmocdtpoc)) = 'SVM' THEN m.kdxcantin ELSE 0 END)::float AS vendido
                    FROM public.kardex m
                    LEFT JOIN public.tipomov t ON TRIM(t.tmocdtpoc) = TRIM(m.tmocdtpoc)
                    WHERE m.empcdempn = :emp AND m.kdxfechad::date >= CURRENT_DATE - :historia::int
                    GROUP BY 1, 2
                    ORDER BY 1, 2
                `, { replacements: { emp: empPoly, historia: HISTORIA_LARGA_DIAS }, type: QueryTypes.SELECT }) as Promise<any[]>,
                // Última entrada por traslado (ETR) de cada artículo a la sucursal: fecha y piezas
                dbPoly.query<any>(`
                    SELECT DISTINCT ON (m.artcdartn) m.artcdartn::int AS art,
                           to_char(m.kdxfechad::date, 'YYYY-MM-DD') AS dia, m.kdxcantin::float AS cantidad
                    FROM public.kardex m
                    WHERE m.empcdempn = :emp AND TRIM(UPPER(m.tmocdtpoc)) = 'ETR'
                    ORDER BY m.artcdartn, m.kdxfechad DESC
                `, { replacements: { emp: empPoly }, type: QueryTypes.SELECT }) as Promise<any[]>,
            ]);
            const ultimaEntradaPor = new Map<number, { fecha: string; cantidad: number }>(
                ultimasEntradas.map(u => [Number(u.art), { fecha: String(u.dia), cantidad: num(u.cantidad) }]));
            const hoyN = (() => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000); })();
            const eventosPor = new Map<number, { dia: number; delta: number; vendido: number }[]>();
            for (const m of movimientos) {
                const art = Number(m.art);
                const lista = eventosPor.get(art) ?? [];
                lista.push({ dia: numeroDeDia(String(m.dia)), delta: num(m.delta), vendido: num(m.vendido) });
                eventosPor.set(art, lista);
            }
            const vendidoPor = new Map<number, number>(ventas.map(v => [Number(v.art), num(v.pz)]));
            const remPor = new Map<number, number>(rem.map(r => [Number(r.art), num(r.pz)]));

            type Cand = { cod: number; existencia: number; minimo: number; maximo: number; vendido: number; diasDisp: number; pico: boolean; pzDiaReciente: number; pzDia: number; dias: number | null; sobrante: number; tipo: 'SIN_VENTA' | 'EXCESO' };
            const candidatos: Cand[] = [];
            let existencia_total = 0;
            for (const e of existencias) {
                const cod = Number(e.art);
                const existencia = num(e.existencia);
                existencia_total += existencia;
                const vendido = vendidoPor.get(cod) ?? 0;
                // Ritmo de venta sobre los días con existencia (si estuvo agotado casi toda la ventana, no se diluye en 26 semanas)
                // y, si lo reciente es un pico contra su historial, sin proyectarlo tal cual
                let diasDisp = VENTANA_DIAS;
                let pzDia = 0;
                let pzDiaReciente = 0;
                let pico = false;
                if (vendido > 0) {
                    const d = disponibilidad(existencia, eventosPor.get(cod) ?? [], hoyN);
                    diasDisp = Math.min(VENTANA_DIAS, Math.max(MIN_DIAS_DISPONIBLE, d.dispRec));
                    pzDiaReciente = vendido / diasDisp;
                    pzDia = pzDiaReciente;
                    const credibilidad = Math.min(1, diasDisp / CRED_DIAS);
                    if (d.dispAnt >= MIN_DIAS_BASE && credibilidad < 1) {
                        const pzDiaBase = d.vendAnt / d.dispAnt;
                        pzDia = credibilidad * pzDiaReciente + (1 - credibilidad) * pzDiaBase;
                        pico = vendido >= MIN_PZ_PICO && pzDiaReciente >= FACTOR_PICO * Math.max(pzDiaBase, 0.01);
                    }
                }
                const objetivo = Math.ceil(pzDia * diasLimite);          // lo que sí se vendería en el plazo
                const sobrante = Math.floor(existencia - objetivo);
                if (sobrante < MIN_PZ_SOBRANTE) continue;
                candidatos.push({
                    cod, existencia, minimo: num(e.minimo), maximo: num(e.maximo), vendido, diasDisp, pico, pzDiaReciente, pzDia,
                    dias: pzDia > 0 ? Math.round(existencia / pzDia) : null,
                    sobrante, tipo: vendido > 0 ? 'EXCESO' : 'SIN_VENTA',
                });
            }
            // Datos del catálogo de todos los candidatos (sirven para saber cuáles maneja el almacén y para mostrar el nombre)
            const info: InfoArt = new Map();
            await completarInfoArticulos(info, candidatos.map(x => x.cod));
            // Se ocultan los que el almacén nunca ha manejado (dulcería, abarrotes…), salvo que se pidan
            const idsCat = candidatos.map(x => info.get(x.cod)?.id).filter(Boolean) as string[];
            const manejados = opts.incluir_no_manejados ? null : await cargarManejadosAlmacen(id_empresa, idsCat);
            const todos = candidatos.length;
            if (manejados) {
                for (let i = candidatos.length - 1; i >= 0; i--) {
                    const idArt = info.get(candidatos[i].cod)?.id;
                    if (!idArt || !manejados.has(idArt)) candidatos.splice(i, 1);
                }
            }
            const ocultos_no_manejados = todos - candidatos.length;
            // Primero lo que más piezas sobran
            candidatos.sort((a, b) => b.sobrante - a.sobrante);
            const visibles = candidatos.slice(0, MAX_SOBREEXISTENCIA);

            const lineas = visibles.map(x => ({
                cod_int_artic: x.cod,
                des_artic: info.get(x.cod)?.des ?? `Artículo ${x.cod}`,
                cod_barr_artic: info.get(x.cod)?.barras ?? '',
                existencia: x.existencia,
                minimo: x.minimo,
                maximo: x.maximo,
                venta_semana: Math.round(x.pzDia * 7 * 10) / 10,
                dias_con_existencia: x.diasDisp,
                ultima_entrada_traslado: ultimaEntradaPor.get(x.cod) ?? null,
                pico_ventas: x.pico,
                venta_semana_reciente: Math.round(x.pzDiaReciente * 7 * 10) / 10,
                dias_cobertura: x.dias,
                sobrante: x.sobrante,
                en_rem: remPor.get(x.cod) ?? 0,
                otros_pedidos: otrosPorCod.get(x.cod)?.pz ?? 0,
                otros_pedidos_detalle: otrosPorCod.get(x.cod)?.detalle ?? [],
                tipo: x.tipo,
            }));
            sucursales.push({
                id_cliente_alm: c.id_cliente_alm as string,
                sucursal: String(c.nom_corto_cliente_alm ?? '').trim() || String(c.razon_social_cliente_alm ?? '').trim() || String(nombre?.[0]?.nom_empre ?? '').trim() || '—',
                emp_poly: empPoly,
                lineas,
                resumen: {
                    articulos: candidatos.length,
                    mostrados: lineas.length,
                    pz_sobrantes: candidatos.reduce((t, x) => t + x.sobrante, 0),
                    sin_venta: candidatos.filter(x => x.tipo === 'SIN_VENTA').length,
                    pz_sin_venta: candidatos.filter(x => x.tipo === 'SIN_VENTA').reduce((t, x) => t + x.sobrante, 0),
                    con_exceso: candidatos.filter(x => x.tipo === 'EXCESO').length,
                    existencia_total: Math.round(existencia_total),
                    ocultos_no_manejados,
                },
            });
        }
        sucursales.sort((a, b) => a.sucursal.localeCompare(b.sucursal, 'es'));
        return { dias_limite: diasLimite, historia_semanas: HISTORIA_SEMANAS, sucursales };
    },
};
