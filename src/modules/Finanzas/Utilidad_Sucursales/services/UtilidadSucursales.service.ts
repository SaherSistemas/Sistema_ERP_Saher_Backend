import { QueryTypes } from 'sequelize';
import { dbLocal, dbPoly } from '../../../../config/db';
import Gasto_Utilidad_Sucursal from '../model/Gasto_Utilidad_Sucursal';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD POR SUCURSAL (sistema anterior, PolyDB) Y UTILIDAD NETA DEL MES
//
// Es el mismo cálculo que "Utilidad por Agente", pero con las farmacias del sistema anterior:
//   Venta  = renglones de los tickets de mostrador (ticket / ticket1) ya cobrados: estatus O (vendido) y D (con devolución).
//            Se dejan fuera los B (cancelados) y los A (ticket abierto, o traslado entre sucursales que se captura como ticket).
//            Las facturas "SVM" del sistema viejo son la facturación global de esos mismos tickets: NO se suman, se contaría doble.
//   Venta sin IVA = importe del renglón − IVA del renglón (el precio de mostrador ya trae el IVA incluido).
//   Costo  = el costo con que el sistema viejo guardó cada renglón al venderlo (costo promedio de ese momento) × piezas.
//   Devoluciones de ticket (devtkt / devtkt1) = restan venta y costo en el mes en que se hicieron.
// Utilidad bruta = venta − costo (sin IVA). Utilidad neta = bruta − gastos capturados del mes.
// Cada "empresa" de PolyDB es una sucursal; las de prueba (22 y 99999) no cuentan.
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v: any) => Number(v) || 0;
const margenDe = (venta: number, util: number) => (venta !== 0 ? Math.round((util / venta) * 1000) / 10 : null);

// Empresas de prueba del sistema viejo
const EXCLUIDAS = [22, 99999];
// O = vendido, D = con devolución. A = ticket abierto (venta en curso al momento de consultar): cuenta igual
// que el sistema viejo, pero solo los de hoy/ayer y nunca en las bodegas (11 y 23), donde la 'A' son traslados.
const BODEGAS = [11, 23];
const STATUS_VENDIDO = `(TRIM(h.tktstatuc) IN ('O','D') OR (TRIM(h.tktstatuc) = 'A' AND h.tktfectkd >= CURRENT_DATE - 1 AND h.empcdempn NOT IN (${BODEGAS.join(',')})))`;

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const FECHA_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function validarMes(mes: string): string {
    if (!MES_RE.test(String(mes ?? ''))) throw Object.assign(new Error('El mes debe venir como AAAA-MM.'), { status: 400 });
    return mes;
}
function rangoMes(mes: string) {
    const [y, m] = mes.split('-').map(Number);
    const sig = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    return { desde: `${mes}-01`, hasta: `${sig}-01` };
}
const mesDe = (fecha: any) => String(fecha).slice(0, 7);

function validarEmpresa(v: any): number | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('Sucursal no válida.'), { status: 400 });
    return n;
}

type FilaVenta = { mes: string; emp: number; tickets: number; devoluciones: number; ventas: number; total_iva: number; costo: number };

// Ventas y costos (ya con las devoluciones restadas) por mes y sucursal dentro de un rango de fechas
async function ventasPorMesYSucursal(desde: string, hasta: string): Promise<FilaVenta[]> {
    const rep = { desde, hasta, excl: EXCLUIDAS };
    const [ventas, devs] = await Promise.all([
        dbPoly.query<any>(`
            SELECT to_char(h.tktfectkd, 'YYYY-MM') AS mes, h.empcdempn AS emp,
                   COUNT(DISTINCT (h.cajcdcajn, h.tktcdtktn))::int AS tickets,
                   COALESCE(SUM(d.tktimpton - d.tktimpivn), 0)::float AS ventas,
                   COALESCE(SUM(d.tktimpton), 0)::float AS total_iva,
                   COALESCE(SUM(d.tktultctn * d.tktcantin), 0)::float AS costo
            FROM ticket h
            JOIN ticket1 d ON d.empcdempn = h.empcdempn AND d.tktcdtktn = h.tktcdtktn AND d.cajcdcajn = h.cajcdcajn
            WHERE h.tktfectkd >= :desde AND h.tktfectkd < :hasta AND ${STATUS_VENDIDO} AND h.empcdempn NOT IN (:excl)
            GROUP BY 1, 2
        `, { replacements: rep, type: QueryTypes.SELECT }),
        dbPoly.query<any>(`
            SELECT to_char(h.detfecded, 'YYYY-MM') AS mes, h.empcdempn AS emp,
                   COUNT(DISTINCT h.detcddetn)::int AS devs,
                   COALESCE(SUM(d.detcancan * d.detprevtn / (1 + COALESCE(d.detivapon, 0) / 100.0)), 0)::float AS ventas,
                   COALESCE(SUM(d.detcancan * d.detprevtn), 0)::float AS total_iva,
                   COALESCE(SUM(d.detcancan * d.detultcon), 0)::float AS costo
            FROM devtkt h
            JOIN devtkt1 d ON d.empcdempn = h.empcdempn AND d.detcddetn = h.detcddetn
            WHERE h.detfecded >= :desde AND h.detfecded < :hasta AND TRIM(h.detstatuc) = 'O' AND h.empcdempn NOT IN (:excl)
            GROUP BY 1, 2
        `, { replacements: rep, type: QueryTypes.SELECT }),
    ]) as [any[], any[]];

    const mapa = new Map<string, FilaVenta>();
    const clave = (mes: string, emp: number) => `${mes}|${emp}`;
    for (const v of ventas) {
        mapa.set(clave(v.mes, num(v.emp)), { mes: String(v.mes), emp: num(v.emp), tickets: num(v.tickets), devoluciones: 0, ventas: num(v.ventas), total_iva: num(v.total_iva), costo: num(v.costo) });
    }
    for (const d of devs) {
        const k = clave(d.mes, num(d.emp));
        const f = mapa.get(k) ?? { mes: String(d.mes), emp: num(d.emp), tickets: 0, devoluciones: 0, ventas: 0, total_iva: 0, costo: 0 };
        f.devoluciones += num(d.devs); f.ventas -= num(d.ventas); f.total_iva -= num(d.total_iva); f.costo -= num(d.costo);
        mapa.set(k, f);
    }
    return Array.from(mapa.values());
}

type Sucursal = { id: number; nombre: string; razon: string | null; activa: boolean };

async function sucursales(): Promise<Sucursal[]> {
    const filas = await dbPoly.query<any>(`
        SELECT empcdempn AS id, TRIM(empnocomc) AS nombre, TRIM(emprazonc) AS razon, TRIM(empstatuc) AS estatus
        FROM empresa WHERE empcdempn NOT IN (:excl) ORDER BY empcdempn
    `, { replacements: { excl: EXCLUIDAS }, type: QueryTypes.SELECT }) as any[];
    return filas.map(f => ({ id: num(f.id), nombre: String(f.nombre || f.razon || `Empresa ${f.id}`), razon: f.razon ? String(f.razon) : null, activa: f.estatus === 'A' }));
}

export interface IDiaUtilidad {
    fecha: string; tickets: number; devoluciones: number; ventas: number; total_iva: number; costo: number; utilidad: number; margen: number | null;
}
export interface ITicketUtilidad {
    clave: string; tipo: 'VENTA' | 'DEV'; id_empresa: number; sucursal: string; folio: number; ticket_origen: number | null;
    hora: string | null; usuario: string | null; estado: string | null; piezas: number;
    ventas: number; total_iva: number; costo: number; utilidad: number; margen: number | null; sin_costo: boolean;
    // Solo en devoluciones: el ticket original que se devolvió (puede ser de otro día)
    origen?: IOrigenDevolucion | null;
}
export interface IOrigenDevolucion {
    clave: string; folio: number; fecha: string; hora: string | null; usuario: string | null;
    ventas: number; total_iva: number; costo: number; utilidad: number; margen: number | null;
}

export const UtilidadSucursalesService = {

    // Un ticket (o una devolución) renglón por renglón. clave: 'T-empresa-caja-ticket' | 'D-empresa-devolucion'
    detalleTicket: async (clave: string) => {
        const m = /^([TD])-(\d+)-(\d+)(?:-(\d+))?$/.exec(String(clave ?? ''));
        if (!m || (m[1] === 'T' && m[4] === undefined) || (m[1] === 'D' && m[4] !== undefined)) throw Object.assign(new Error('Ticket no válido.'), { status: 400 });
        const emp = Number(m[2]);
        const lista = await sucursales();
        const sucursal = lista.find(s => s.id === emp)?.nombre ?? `Empresa ${emp}`;

        let cab: any, filas: any[];
        if (m[1] === 'T') {
            const caja = Number(m[3]), tkt = Number(m[4]);
            [cab] = await dbPoly.query<any>(`
                SELECT to_char(tktfectkd, 'YYYY-MM-DD') AS fecha, TRIM(tkthortkc) AS hora, TRIM(tktusuarc) AS usuario, TRIM(tktstatuc) AS estatus
                FROM ticket WHERE empcdempn = :emp AND cajcdcajn = :caja AND tktcdtktn = :tkt
            `, { replacements: { emp, caja, tkt }, type: QueryTypes.SELECT });
            if (!cab) throw Object.assign(new Error('El ticket no existe.'), { status: 404 });
            filas = await dbPoly.query<any>(`
                SELECT artcdartn AS codigo, TRIM(tktdsartc) AS descripcion, tktcantin::float AS cantidad,
                       (tktimpton - tktimpivn)::float AS ventas, tktimpton::float AS total_iva, (tktultctn * tktcantin)::float AS costo, tktultctn::float AS costo_unitario
                FROM ticket1 WHERE empcdempn = :emp AND cajcdcajn = :caja AND tktcdtktn = :tkt
            `, { replacements: { emp, caja, tkt }, type: QueryTypes.SELECT }) as any[];
        } else {
            const dev = Number(m[3]);
            [cab] = await dbPoly.query<any>(`
                SELECT to_char(detfecded, 'YYYY-MM-DD') AS fecha, TRIM(dethorapc) AS hora, TRIM(segusuidc) AS usuario, TRIM(detstatuc) AS estatus, detcvtktn AS ticket_origen
                FROM devtkt WHERE empcdempn = :emp AND detcddetn = :dev
            `, { replacements: { emp, dev }, type: QueryTypes.SELECT });
            if (!cab) throw Object.assign(new Error('La devolución no existe.'), { status: 404 });
            filas = await dbPoly.query<any>(`
                SELECT d.artcdartn AS codigo,
                       (SELECT TRIM(MAX(t1.tktdsartc)) FROM ticket1 t1 WHERE t1.empcdempn = d.empcdempn AND t1.tktcdtktn = :orig AND t1.artcdartn = d.artcdartn) AS descripcion,
                       d.detcancan::float AS cantidad,
                       (d.detcancan * d.detprevtn / (1 + COALESCE(d.detivapon, 0) / 100.0))::float AS ventas,
                       (d.detcancan * d.detprevtn)::float AS total_iva,
                       (d.detcancan * d.detultcon)::float AS costo, d.detultcon::float AS costo_unitario
                FROM devtkt1 d WHERE d.empcdempn = :emp AND d.detcddetn = :dev
            `, { replacements: { emp, dev, orig: num(cab.ticket_origen) }, type: QueryTypes.SELECT }) as any[];
        }

        const signo = m[1] === 'D' ? -1 : 1;   // la devolución resta
        const renglones = filas.map(f => {
            const cantidad = num(f.cantidad) * signo, ventas = num(f.ventas) * signo, totalIva = num(f.total_iva) * signo, costo = num(f.costo) * signo;
            return {
                codigo: f.codigo !== null && f.codigo !== undefined ? Number(f.codigo) : null,
                articulo: f.descripcion ? String(f.descripcion).trim() : '(sin descripción)',
                cantidad,
                precio_unitario: num(f.cantidad) > 0 ? round2(num(f.ventas) / num(f.cantidad)) : 0,
                ventas: round2(ventas),
                total_iva: round2(totalIva),
                costo_unitario: round2(num(f.costo_unitario)),
                costo: round2(costo),
                utilidad: round2(ventas - costo),
                margen: margenDe(ventas, ventas - costo),
                sin_costo: num(f.ventas) > 0 && num(f.costo_unitario) === 0,
            };
        }).sort((a, b) => Math.abs(b.ventas) - Math.abs(a.ventas));

        const ventasT = renglones.reduce((s, r) => s + r.ventas, 0), costoT = renglones.reduce((s, r) => s + r.costo, 0), totalIvaT = renglones.reduce((s, r) => s + r.total_iva, 0);
        return {
            clave, tipo: m[1] === 'T' ? 'VENTA' : 'DEV', sucursal, id_empresa: emp,
            folio: Number(m[1] === 'T' ? m[4] : m[3]), ticket_origen: cab.ticket_origen !== undefined ? num(cab.ticket_origen) : null,
            fecha: String(cab.fecha), hora: cab.hora ?? null, usuario: cab.usuario ?? null,
            estado: m[1] === 'T' ? (cab.estatus === 'D' ? 'Con devolución' : 'Vendido') : 'Devolución',
            renglones,
            totales: {
                renglones: renglones.length, piezas: round2(renglones.reduce((s, r) => s + r.cantidad, 0)),
                ventas: round2(ventasT), total_iva: round2(totalIvaT), costo: round2(costoT), utilidad: round2(ventasT - costoT), margen: margenDe(ventasT, ventasT - costoT),
            },
        };
    },

    // Detalle de un mes por día. idEmpresa vacío = todas las sucursales.
    detalleMes: async (mesParam: string, idEmpresa?: number) => {
        const mes = validarMes(mesParam);
        const { desde, hasta } = rangoMes(mes);
        const filtroT = idEmpresa ? 'AND h.empcdempn = :emp' : '';
        const rep = { desde, hasta, excl: EXCLUIDAS, emp: idEmpresa };
        const [ventas, devs, lista] = await Promise.all([
            dbPoly.query<any>(`
                SELECT to_char(h.tktfectkd, 'YYYY-MM-DD') AS fecha,
                       COUNT(DISTINCT (h.empcdempn, h.cajcdcajn, h.tktcdtktn))::int AS tickets,
                       COALESCE(SUM(d.tktimpton - d.tktimpivn), 0)::float AS ventas,
                       COALESCE(SUM(d.tktimpton), 0)::float AS total_iva,
                       COALESCE(SUM(d.tktultctn * d.tktcantin), 0)::float AS costo
                FROM ticket h
                JOIN ticket1 d ON d.empcdempn = h.empcdempn AND d.tktcdtktn = h.tktcdtktn AND d.cajcdcajn = h.cajcdcajn
                WHERE h.tktfectkd >= :desde AND h.tktfectkd < :hasta AND ${STATUS_VENDIDO} AND h.empcdempn NOT IN (:excl) ${filtroT}
                GROUP BY 1
            `, { replacements: rep, type: QueryTypes.SELECT }),
            dbPoly.query<any>(`
                SELECT to_char(h.detfecded, 'YYYY-MM-DD') AS fecha, COUNT(DISTINCT (h.empcdempn, h.detcddetn))::int AS devs,
                       COALESCE(SUM(d.detcancan * d.detprevtn / (1 + COALESCE(d.detivapon, 0) / 100.0)), 0)::float AS ventas,
                       COALESCE(SUM(d.detcancan * d.detprevtn), 0)::float AS total_iva,
                       COALESCE(SUM(d.detcancan * d.detultcon), 0)::float AS costo
                FROM devtkt h
                JOIN devtkt1 d ON d.empcdempn = h.empcdempn AND d.detcddetn = h.detcddetn
                WHERE h.detfecded >= :desde AND h.detfecded < :hasta AND TRIM(h.detstatuc) = 'O' AND h.empcdempn NOT IN (:excl) ${filtroT}
                GROUP BY 1
            `, { replacements: rep, type: QueryTypes.SELECT }),
            sucursales(),
        ]) as [any[], any[], Sucursal[]];

        const porDia = new Map<string, IDiaUtilidad>();
        const dia = (f: string) => porDia.get(f) ?? { fecha: f, tickets: 0, devoluciones: 0, ventas: 0, total_iva: 0, costo: 0, utilidad: 0, margen: null };
        for (const v of ventas) { const x = dia(v.fecha); x.tickets += num(v.tickets); x.ventas += num(v.ventas); x.total_iva += num(v.total_iva); x.costo += num(v.costo); porDia.set(v.fecha, x); }
        for (const d of devs) { const x = dia(d.fecha); x.devoluciones += num(d.devs); x.ventas -= num(d.ventas); x.total_iva -= num(d.total_iva); x.costo -= num(d.costo); porDia.set(d.fecha, x); }

        const dias = Array.from(porDia.values()).map(x => ({
            ...x, ventas: round2(x.ventas), total_iva: round2(x.total_iva), costo: round2(x.costo), utilidad: round2(x.ventas - x.costo), margen: margenDe(x.ventas, x.ventas - x.costo),
        })).sort((a, b) => a.fecha.localeCompare(b.fecha));

        const ventasT = dias.reduce((s, d) => s + d.ventas, 0), costoT = dias.reduce((s, d) => s + d.costo, 0), totalIvaT = dias.reduce((s, d) => s + d.total_iva, 0);
        return {
            mes,
            sucursal: idEmpresa ? { id: idEmpresa, nombre: lista.find(s => s.id === idEmpresa)?.nombre ?? `Empresa ${idEmpresa}` } : null,
            dias,
            totales: {
                dias: dias.length, tickets: dias.reduce((s, d) => s + d.tickets, 0), devoluciones: dias.reduce((s, d) => s + d.devoluciones, 0),
                ventas: round2(ventasT), total_iva: round2(totalIvaT), costo: round2(costoT), utilidad: round2(ventasT - costoT), margen: margenDe(ventasT, ventasT - costoT),
            },
        };
    },

    // Los tickets (y devoluciones) de un día, de una sucursal o de todas
    ticketsDelDia: async (fecha: string, idEmpresa?: number): Promise<ITicketUtilidad[]> => {
        if (!FECHA_RE.test(String(fecha ?? ''))) throw Object.assign(new Error('La fecha debe venir como AAAA-MM-DD.'), { status: 400 });
        const filtroT = idEmpresa ? 'AND h.empcdempn = :emp' : '';
        const rep = { fecha, excl: EXCLUIDAS, emp: idEmpresa };
        const [ventas, devs, origenes, lista] = await Promise.all([
            dbPoly.query<any>(`
                SELECT h.empcdempn AS emp, h.cajcdcajn AS caja, h.tktcdtktn AS folio, TRIM(h.tkthortkc) AS hora, TRIM(h.tktusuarc) AS usuario, TRIM(h.tktstatuc) AS estatus,
                       SUM(d.tktcantin)::float AS piezas, SUM(d.tktimpton - d.tktimpivn)::float AS ventas, SUM(d.tktimpton)::float AS total_iva, SUM(d.tktultctn * d.tktcantin)::float AS costo,
                       COUNT(*) FILTER (WHERE d.tktultctn = 0 AND d.tktimpton > 0)::int AS sin_costo
                FROM ticket h
                JOIN ticket1 d ON d.empcdempn = h.empcdempn AND d.tktcdtktn = h.tktcdtktn AND d.cajcdcajn = h.cajcdcajn
                WHERE h.tktfectkd = :fecha::date AND ${STATUS_VENDIDO} AND h.empcdempn NOT IN (:excl) ${filtroT}
                GROUP BY 1, 2, 3, 4, 5, 6
            `, { replacements: rep, type: QueryTypes.SELECT }),
            dbPoly.query<any>(`
                SELECT h.empcdempn AS emp, h.detcddetn AS folio, h.detcvtktn AS ticket_origen, TRIM(h.dethorapc) AS hora, TRIM(h.segusuidc) AS usuario,
                       SUM(d.detcancan)::float AS piezas,
                       SUM(d.detcancan * d.detprevtn / (1 + COALESCE(d.detivapon, 0) / 100.0))::float AS ventas, SUM(d.detcancan * d.detprevtn)::float AS total_iva, SUM(d.detcancan * d.detultcon)::float AS costo
                FROM devtkt h
                JOIN devtkt1 d ON d.empcdempn = h.empcdempn AND d.detcddetn = h.detcddetn
                WHERE h.detfecded = :fecha::date AND TRIM(h.detstatuc) = 'O' AND h.empcdempn NOT IN (:excl) ${filtroT}
                GROUP BY 1, 2, 3, 4, 5
            `, { replacements: rep, type: QueryTypes.SELECT }),
            // Ticket original de cada devolución del día (para mostrarlo junto a la devolución)
            dbPoly.query<any>(`
                SELECT h.empcdempn AS emp, h.detcddetn AS dev, t.cajcdcajn AS caja, t.tktcdtktn AS folio,
                       to_char(t.tktfectkd, 'YYYY-MM-DD') AS fecha, TRIM(t.tkthortkc) AS hora, TRIM(t.tktusuarc) AS usuario,
                       SUM(d.tktimpton - d.tktimpivn)::float AS ventas, SUM(d.tktimpton)::float AS total_iva, SUM(d.tktultctn * d.tktcantin)::float AS costo
                FROM devtkt h
                JOIN ticket t ON t.empcdempn = h.empcdempn AND t.cajcdcajn = h.cajcdcajn AND t.tktcdtktn = h.detcvtktn
                JOIN ticket1 d ON d.empcdempn = t.empcdempn AND d.cajcdcajn = t.cajcdcajn AND d.tktcdtktn = t.tktcdtktn
                WHERE h.detfecded = :fecha::date AND TRIM(h.detstatuc) = 'O' AND h.empcdempn NOT IN (:excl) ${filtroT}
                GROUP BY 1, 2, 3, 4, 5, 6, 7
            `, { replacements: rep, type: QueryTypes.SELECT }),
            sucursales(),
        ]) as [any[], any[], any[], Sucursal[]];

        const origenDe = new Map<string, IOrigenDevolucion>();
        for (const o of origenes) {
            const ve = num(o.ventas), co = num(o.costo);
            origenDe.set(`${o.emp}|${o.dev}`, {
                clave: `T-${o.emp}-${o.caja}-${o.folio}`, folio: num(o.folio), fecha: String(o.fecha), hora: o.hora ?? null, usuario: o.usuario ?? null,
                ventas: round2(ve), total_iva: round2(num(o.total_iva)), costo: round2(co), utilidad: round2(ve - co), margen: margenDe(ve, ve - co),
            });
        }

        const nombre = new Map(lista.map(s => [s.id, s.nombre]));
        const filas: ITicketUtilidad[] = [];
        for (const v of ventas) {
            const ve = num(v.ventas), co = num(v.costo);
            filas.push({
                clave: `T-${v.emp}-${v.caja}-${v.folio}`, tipo: 'VENTA', id_empresa: num(v.emp), sucursal: nombre.get(num(v.emp)) ?? `Empresa ${v.emp}`,
                folio: num(v.folio), ticket_origen: null, hora: v.hora ?? null, usuario: v.usuario ?? null, estado: v.estatus === 'D' ? 'Con devolución' : 'Vendido',
                piezas: round2(num(v.piezas)), ventas: round2(ve), total_iva: round2(num(v.total_iva)), costo: round2(co), utilidad: round2(ve - co), margen: margenDe(ve, ve - co), sin_costo: num(v.sin_costo) > 0,
            });
        }
        for (const d of devs) {
            const ve = -num(d.ventas), co = -num(d.costo);
            filas.push({
                clave: `D-${d.emp}-${d.folio}`, tipo: 'DEV', id_empresa: num(d.emp), sucursal: nombre.get(num(d.emp)) ?? `Empresa ${d.emp}`,
                folio: num(d.folio), ticket_origen: num(d.ticket_origen), hora: d.hora ?? null, usuario: d.usuario ?? null, estado: 'Devolución',
                piezas: -round2(num(d.piezas)), ventas: round2(ve), total_iva: -round2(num(d.total_iva)), costo: round2(co), utilidad: round2(ve - co), margen: margenDe(ve, ve - co), sin_costo: false,
                origen: origenDe.get(`${d.emp}|${d.folio}`) ?? null,
            });
        }
        return filas.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));
    },

    // Utilidad por sucursal de un mes + gastos del mes + utilidad neta
    resumenMes: async (mesParam: string) => {
        const mes = validarMes(mesParam);
        const { desde, hasta } = rangoMes(mes);
        const [filas, lista, gastos] = await Promise.all([
            ventasPorMesYSucursal(desde, hasta),
            sucursales(),
            Gasto_Utilidad_Sucursal.findAll({ where: { mes: desde }, order: [['createdAt', 'ASC']], raw: true }) as Promise<any[]>,
        ]);

        const gastosPorSucursal = new Map<number | null, number>();
        for (const g of gastos) gastosPorSucursal.set(g.id_empresa_poly ?? null, (gastosPorSucursal.get(g.id_empresa_poly ?? null) ?? 0) + num(g.monto));

        const porSucursal = new Map<number, FilaVenta>(filas.map(f => [f.emp, f]));
        const ids = new Set<number>([...porSucursal.keys(), ...Array.from(gastosPorSucursal.keys()).filter((k): k is number => k !== null)]);
        const info = new Map(lista.map(s => [s.id, s]));

        const lineas = Array.from(ids).map(id => {
            const v = porSucursal.get(id);
            const ventas = v?.ventas ?? 0, costo = v?.costo ?? 0;
            const bruta = ventas - costo;
            const gastosSuc = gastosPorSucursal.get(id) ?? 0;
            return {
                id_empresa: id,
                nombre: info.get(id)?.nombre ?? `Empresa ${id}`,
                tickets: v?.tickets ?? 0,
                devoluciones: v?.devoluciones ?? 0,
                ventas: round2(ventas),
                total_iva: round2(v?.total_iva ?? 0),
                costo: round2(costo),
                utilidad_bruta: round2(bruta),
                margen: margenDe(ventas, bruta),
                gastos_asignados: round2(gastosSuc),
                utilidad_neta_sucursal: round2(bruta - gastosSuc),
            };
        }).sort((a, b) => b.utilidad_bruta - a.utilidad_bruta);

        const ventasT = lineas.reduce((s, l) => s + l.ventas, 0);
        const costoT = lineas.reduce((s, l) => s + l.costo, 0);
        const totalIvaT = lineas.reduce((s, l) => s + l.total_iva, 0);
        const brutaT = ventasT - costoT;
        const gastosT = gastos.reduce((s, g) => s + num(g.monto), 0);
        const gastosGenerales = gastosPorSucursal.get(null) ?? 0;

        return {
            mes,
            sucursales: lineas,
            sucursales_catalogo: lista.filter(s => s.activa).map(s => ({ id_empresa: s.id, nombre: s.nombre })),
            gastos: gastos.map(g => ({
                id_gasto_utilidad_sucursal: g.id_gasto_utilidad_sucursal, mes: mesDe(g.mes), concepto: g.concepto, categoria: g.categoria,
                monto: round2(num(g.monto)), id_empresa: g.id_empresa_poly ?? null,
                sucursal: g.id_empresa_poly ? (info.get(g.id_empresa_poly)?.nombre ?? `Empresa ${g.id_empresa_poly}`) : null, notas: g.notas,
            })),
            totales: {
                ventas: round2(ventasT),
                total_iva: round2(totalIvaT),
                costo: round2(costoT),
                utilidad_bruta: round2(brutaT),
                margen: margenDe(ventasT, brutaT),
                gastos_sucursales: round2(gastosT - gastosGenerales),
                gastos_generales: round2(gastosGenerales),
                gastos: round2(gastosT),
                utilidad_neta: round2(brutaT - gastosT),
                tickets: lineas.reduce((s, l) => s + l.tickets, 0),
                devoluciones: lineas.reduce((s, l) => s + l.devoluciones, 0),
            },
        };
    },

    // Mes por mes de un año: ventas, costo, bruta, gastos y neta
    resumenAnual: async (anio: number) => {
        if (!Number.isInteger(anio) || anio < 2015 || anio > 2100) throw Object.assign(new Error('Año no válido.'), { status: 400 });
        const [filas, gastos] = await Promise.all([
            ventasPorMesYSucursal(`${anio}-01-01`, `${anio + 1}-01-01`),
            Gasto_Utilidad_Sucursal.findAll({ where: dbLocal.where(dbLocal.fn('date_part', 'year', dbLocal.col('mes')), anio), raw: true }) as Promise<any[]>,
        ]);
        const meses = Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, '0')}`);
        const filaMes = meses.map(mes => {
            const delMes = filas.filter(f => f.mes === mes);
            const ventas = delMes.reduce((s, f) => s + f.ventas, 0);
            const costo = delMes.reduce((s, f) => s + f.costo, 0);
            const gastosMes = gastos.filter(g => mesDe(g.mes) === mes).reduce((s, g) => s + num(g.monto), 0);
            const bruta = ventas - costo;
            return {
                mes,
                tickets: delMes.reduce((s, f) => s + f.tickets, 0),
                ventas: round2(ventas), costo: round2(costo),
                utilidad_bruta: round2(bruta),
                margen: margenDe(ventas, bruta),
                gastos: round2(gastosMes),
                utilidad_neta: round2(bruta - gastosMes),
            };
        });
        const suma = (k: 'ventas' | 'costo' | 'utilidad_bruta' | 'gastos' | 'utilidad_neta') => round2(filaMes.reduce((s, m) => s + m[k], 0));
        return {
            anio,
            meses: filaMes,
            totales: { ventas: suma('ventas'), costo: suma('costo'), utilidad_bruta: suma('utilidad_bruta'), gastos: suma('gastos'), utilidad_neta: suma('utilidad_neta') },
        };
    },

    // ── Gastos ──────────────────────────────────────────────────────────────
    crearGasto: async (d: { mes: string; concepto: string; categoria?: string | null; monto: number; id_empresa?: number | string | null; notas?: string | null }, usuario?: string) => {
        const mes = validarMes(d.mes);
        const concepto = String(d.concepto ?? '').trim();
        const monto = round2(num(d.monto));
        if (!concepto) throw Object.assign(new Error('Escribe el concepto del gasto.'), { status: 400 });
        if (!(monto > 0)) throw Object.assign(new Error('El monto debe ser mayor a cero.'), { status: 400 });
        return await Gasto_Utilidad_Sucursal.create({
            mes: `${mes}-01`, concepto: concepto.slice(0, 150), categoria: d.categoria ? String(d.categoria).trim().slice(0, 60) : null,
            monto, id_empresa_poly: validarEmpresa(d.id_empresa) ?? null, notas: d.notas ? String(d.notas).trim() : null, registrado_por: usuario ?? null,
        } as any);
    },

    actualizarGasto: async (id: string, d: { mes?: string; concepto?: string; categoria?: string | null; monto?: number; id_empresa?: number | string | null; notas?: string | null }) => {
        const g = await Gasto_Utilidad_Sucursal.findByPk(id);
        if (!g) throw Object.assign(new Error('El gasto no existe.'), { status: 404 });
        const cambios: any = {};
        if (d.mes !== undefined) cambios.mes = `${validarMes(d.mes)}-01`;
        if (d.concepto !== undefined) {
            const c = String(d.concepto).trim();
            if (!c) throw Object.assign(new Error('Escribe el concepto del gasto.'), { status: 400 });
            cambios.concepto = c.slice(0, 150);
        }
        if (d.categoria !== undefined) cambios.categoria = d.categoria ? String(d.categoria).trim().slice(0, 60) : null;
        if (d.monto !== undefined) {
            const m = round2(num(d.monto));
            if (!(m > 0)) throw Object.assign(new Error('El monto debe ser mayor a cero.'), { status: 400 });
            cambios.monto = m;
        }
        if (d.id_empresa !== undefined) cambios.id_empresa_poly = validarEmpresa(d.id_empresa) ?? null;
        if (d.notas !== undefined) cambios.notas = d.notas ? String(d.notas).trim() : null;
        await g.update(cambios);
        return g;
    },

    eliminarGasto: async (id: string) => {
        const n = await Gasto_Utilidad_Sucursal.destroy({ where: { id_gasto_utilidad_sucursal: id } });
        if (!n) throw Object.assign(new Error('El gasto no existe.'), { status: 404 });
    },

    // Copia los gastos de un mes a otro (renta, sueldos…). No duplica los que ya estén con el mismo concepto y sucursal.
    copiarGastos: async (desdeMes: string, haciaMes: string, usuario?: string) => {
        const origen = validarMes(desdeMes), destino = validarMes(haciaMes);
        if (origen === destino) throw Object.assign(new Error('Elige dos meses distintos.'), { status: 400 });
        const [delOrigen, delDestino] = await Promise.all([
            Gasto_Utilidad_Sucursal.findAll({ where: { mes: `${origen}-01` }, raw: true }) as Promise<any[]>,
            Gasto_Utilidad_Sucursal.findAll({ where: { mes: `${destino}-01` }, raw: true }) as Promise<any[]>,
        ]);
        const llave = (g: any) => `${String(g.concepto).toLowerCase()}|${g.id_empresa_poly ?? ''}`;
        const yaEsta = new Set(delDestino.map(llave));
        const nuevos = delOrigen.filter(g => !yaEsta.has(llave(g)));
        for (const g of nuevos) {
            await Gasto_Utilidad_Sucursal.create({
                mes: `${destino}-01`, concepto: g.concepto, categoria: g.categoria, monto: g.monto,
                id_empresa_poly: g.id_empresa_poly ?? null, notas: g.notas, registrado_por: usuario ?? null,
            } as any);
        }
        return { copiados: nuevos.length, omitidos: delOrigen.length - nuevos.length };
    },
};
