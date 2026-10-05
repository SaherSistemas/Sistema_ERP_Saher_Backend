import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';

export interface CantidadPorLote {
    id_articulo: string;
    id_lote_sucursal: string;
    /** Lo que el surtidor sacó (detalle_pedido_almacen_lote). */
    surtido: number;
    /** Lo que de verdad se factura y debe descontarse del stock / Kardex. */
    facturar: number;
}

/**
 * Cantidades por lote que corresponden a la salida de un pedido.
 *
 * La factura se arma con lo CHEQUEADO (detalle_pedido_almacen_chequeo.cant_chequeada), pero el stock y el
 * Kardex se descontaban con lo SURTIDO. Si una pieza se surtió y no se chequeó, se descontaba sin que
 * saliera en la factura. Aquí se iguala: si el artículo tiene filas de chequeo, solo se descuenta lo
 * chequeado (primero lo ligado a cada lote y el resto en orden); si no tiene chequeo (ej. los vales, que
 * se entregan sin chequeo) se conserva lo surtido, como antes.
 */
export async function cantidadesPorLoteDelPedido(id_pedido_alm: string, t: Transaction): Promise<CantidadPorLote[]> {
    const rows = await dbLocal.query<{
        id_detalle: string;
        id_articulo: string;
        id_lote_sucursal: string;
        cantidad: string;
        chq_lote: string;
        filas_chq: string;
        chq_detalle: string;
    }>(`
        SELECT
            dpa.id_detalle_pedido_almacen AS id_detalle,
            dpa.id_articulo,
            dpal.id_lote_sucursal,
            dpal.cantidad,
            COALESCE((
                SELECT SUM(c.cant_chequeada) FROM detalle_pedido_almacen_chequeo c
                WHERE c.id_detalle_pedido_almacen_lote = dpal.id_detalle_pedido_almacen_lote AND c.estado <> 'CANCELADO'
            ), 0) AS chq_lote,
            (
                SELECT COUNT(*) FROM detalle_pedido_almacen_chequeo c
                WHERE c.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen AND c.estado <> 'CANCELADO'
            ) AS filas_chq,
            COALESCE((
                SELECT SUM(c.cant_chequeada) FROM detalle_pedido_almacen_chequeo c
                WHERE c.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen AND c.estado <> 'CANCELADO'
            ), 0) AS chq_detalle
        FROM detalle_pedido_almacen dpa
        JOIN detalle_pedido_almacen_lote dpal
            ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
        WHERE dpa.id_pedido_almacen = :id_pedido_alm
        ORDER BY dpa.id_detalle_pedido_almacen, dpal.id_detalle_pedido_almacen_lote
    `, { replacements: { id_pedido_alm }, type: QueryTypes.SELECT, transaction: t });

    const porDetalle = new Map<string, typeof rows>();
    for (const r of rows) {
        const arr = porDetalle.get(r.id_detalle) ?? [];
        arr.push(r);
        porDetalle.set(r.id_detalle, arr);
    }

    const acumulado = new Map<string, CantidadPorLote>();
    for (const lineas of porDetalle.values()) {
        const surtidos = lineas.map(l => Number(l.cantidad) || 0);
        let facturar: number[];

        if (Number(lineas[0].filas_chq) === 0) {
            facturar = [...surtidos];
        } else {
            const totalSurtido = surtidos.reduce((s, n) => s + n, 0);
            let restante = Math.min(totalSurtido, Number(lineas[0].chq_detalle) || 0);
            facturar = lineas.map((l, i) => Math.min(surtidos[i], Number(l.chq_lote) || 0));
            restante -= facturar.reduce((s, n) => s + n, 0);
            for (let i = 0; i < lineas.length && restante > 0; i++) {
                const extra = Math.min(surtidos[i] - facturar[i], restante);
                facturar[i] += extra;
                restante -= extra;
            }
        }

        lineas.forEach((l, i) => {
            const clave = `${l.id_articulo}|${l.id_lote_sucursal}`;
            const previo = acumulado.get(clave) ?? {
                id_articulo: l.id_articulo, id_lote_sucursal: l.id_lote_sucursal, surtido: 0, facturar: 0,
            };
            previo.surtido += surtidos[i];
            previo.facturar += facturar[i];
            acumulado.set(clave, previo);
        });
    }

    return [...acumulado.values()].filter(c => c.surtido > 0);
}
