import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';

// Tiempos de los tres procesos del almacén (surtido, chequeo y empaque) por empleado.
//
// Tiempo de un empleado en un pedido = del inicio más temprano al fin más tardío de SUS renglones en ese
// pedido (si no hay "inicio", se usa la hora en que se le asignó). Solo cuentan trabajos terminados.
// Se descartan los trabajos de menos de 5 s o de más de 6 horas: casi siempre son un pedido que se quedó
// abierto (se fue a comer, terminó otro día, etc.) y desvirtúan el promedio. Se informa cuántos fueron.

const MAX_SEG = 6 * 3600;
const MIN_SEG = 5;

interface FilaEmpleado {
    id_empleado: string;
    nombre: string;
    pedidos: number;
    volumen: number;          // renglones (surtido/chequeo) o bultos (empaque)
    promedio_seg: number;     // por pedido
    seg_por_unidad: number | null;
}

export interface ProcesoResumen {
    pedidos: number;
    promedio_seg: number;
    descartados: number;
    unidad: 'renglón' | 'bulto';
    empleados: FilaEmpleado[];
}

const num = (v: unknown) => Number(v ?? 0) || 0;

// `trabajos` debe devolver: id_pedido, id_empleado, ini, fin, volumen — una fila por (pedido, empleado)
async function resumir(trabajos: string, desde: string, hasta: string, unidad: 'renglón' | 'bulto'): Promise<ProcesoResumen> {
    const base = `
        WITH t AS (${trabajos}),
        d AS (SELECT t.*, EXTRACT(EPOCH FROM (t.fin - t.ini)) AS seg FROM t WHERE t.fin IS NOT NULL AND t.ini IS NOT NULL)
    `;
    const rep = { desde, hasta, minSeg: MIN_SEG, maxSeg: MAX_SEG };

    const [filas, descartes] = await Promise.all([
        dbLocal.query<any>(`
            ${base}
            SELECT d.id_empleado,
                   TRIM(CONCAT(e.nombre_empleado, ' ', e.ap_pat_empleado)) AS nombre,
                   COUNT(*)            AS pedidos,
                   SUM(d.volumen)      AS volumen,
                   AVG(d.seg)          AS promedio_seg,
                   SUM(d.seg)          AS seg_total
            FROM d
            LEFT JOIN empleado e ON e.id_empleado = d.id_empleado
            WHERE d.seg BETWEEN :minSeg AND :maxSeg
            GROUP BY d.id_empleado, e.nombre_empleado, e.ap_pat_empleado
            ORDER BY COUNT(*) DESC, AVG(d.seg) ASC
        `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
        dbLocal.query<any>(`
            ${base}
            SELECT COUNT(*) AS descartados FROM d WHERE d.seg < :minSeg OR d.seg > :maxSeg
        `, { replacements: rep, type: QueryTypes.SELECT }) as Promise<any[]>,
    ]);

    let pedidos = 0;
    let segTotal = 0;
    const empleados: FilaEmpleado[] = filas.map(r => {
        const p = num(r.pedidos);
        const seg = num(r.seg_total);
        const vol = num(r.volumen);
        pedidos += p;
        segTotal += seg;
        return {
            id_empleado: r.id_empleado,
            nombre: r.nombre?.trim() || 'Sin nombre',
            pedidos: p,
            volumen: vol,
            promedio_seg: Math.round(num(r.promedio_seg)),
            seg_por_unidad: vol > 0 ? Math.round(seg / vol) : null,
        };
    });

    return {
        pedidos,
        promedio_seg: pedidos > 0 ? Math.round(segTotal / pedidos) : 0,
        descartados: num(descartes[0]?.descartados),
        unidad,
        empleados,
    };
}

export const ProductividadAlmacenService = {

    // desde / hasta: 'YYYY-MM-DD', ambos incluidos, por fecha LOCAL (Culiacán) de cuando terminó el trabajo
    getProcesos: async (desde: string, hasta: string) => {
        const [surtido, chequeo, empaque] = await Promise.all([
            // SURTIDO — asignaciones de surtidor terminadas
            resumir(`
                SELECT dpa.id_pedido_almacen AS id_pedido, a.id_usuario AS id_empleado,
                       MIN(COALESCE(a.inicio, a.fecha_asignado)) AS ini, MAX(a.fin) AS fin,
                       COUNT(DISTINCT a.id_detalle_pedido_almacen) AS volumen
                FROM detalle_pedido_almacen_asignacion a
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = a.id_detalle_pedido_almacen
                WHERE a.estado = 'TERMINADO' AND a.fin IS NOT NULL
                  AND (a.fin AT TIME ZONE 'America/Mazatlan')::date BETWEEN :desde AND :hasta
                GROUP BY dpa.id_pedido_almacen, a.id_usuario
            `, desde, hasta, 'renglón'),

            // CHEQUEO — filas de chequeo terminadas
            resumir(`
                SELECT dpa.id_pedido_almacen AS id_pedido, c.id_empleado,
                       MIN(COALESCE(c.inicio, c.fecha_asignado)) AS ini, MAX(c.fin) AS fin,
                       COUNT(DISTINCT c.id_detalle_pedido_almacen) AS volumen
                FROM detalle_pedido_almacen_chequeo c
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = c.id_detalle_pedido_almacen
                WHERE c.estado = 'TERMINADO' AND c.fin IS NOT NULL
                  AND (c.fin AT TIME ZONE 'America/Mazatlan')::date BETWEEN :desde AND :hasta
                GROUP BY dpa.id_pedido_almacen, c.id_empleado
            `, desde, hasta, 'renglón'),

            // EMPAQUE — un registro por pedido; el volumen son las cajas + bolsas
            resumir(`
                SELECT e.id_pedido_almacen AS id_pedido, e.id_empleado_empaco AS id_empleado,
                       COALESCE(e.inicio, e.fecha_asignado) AS ini, e.fin AS fin,
                       (COALESCE(e.cajas, 0) + COALESCE(e.bolsas, 0)) AS volumen
                FROM pedido_almacen_empaque e
                WHERE e.fin IS NOT NULL
                  AND (e.fin AT TIME ZONE 'America/Mazatlan')::date BETWEEN :desde AND :hasta
            `, desde, hasta, 'bulto'),
        ]);

        return { desde, hasta, surtido, chequeo, empaque, limite_horas: MAX_SEG / 3600, generado: new Date().toISOString() };
    },
};
