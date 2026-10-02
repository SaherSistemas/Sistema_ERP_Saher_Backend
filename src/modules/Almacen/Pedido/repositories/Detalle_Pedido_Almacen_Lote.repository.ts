import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import { ICreateDetallePedidoAlmacenLote } from '../interface/Detalle_Pedido_Almacen_Lote.interface';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Ubicacion_Sucursal from '../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal';

type LoteEntrada = ICreateDetallePedidoAlmacenLote['lotes'][number];

const libre = (s: Stock_Ubicacion_Lote) => (Number(s.cantidad) || 0) - (Number(s.cantidad_apartada) || 0);

export const Detalle_Pedido_Almacen_LoteRepository = {
    create: async (
        data: ICreateDetallePedidoAlmacenLote,
        transaction?: Transaction
    ) => {
        const { id_detalle_pedido, lotes } = data;

        if (!id_detalle_pedido) throw new Error("id_detalle_pedido es requerido");
        //  console.log(data)
        if (!Array.isArray(lotes) || lotes.length === 0) throw new Error("Debes enviar al menos un lote");

        const rows: any[] = [];

        const agregar = (item: LoteEntrada, id_stock: string | null, id_ubicacion: string | null, cantidad: number) => {
            rows.push({
                id_detalle_pedido_almacen_lote: uuidv4(),
                id_detalle_pedido_almacen: id_detalle_pedido,
                id_stock_ubicacion_lote: id_stock ?? item.id_stock_ubicacion_lote,
                id_lote_sucursal: item.id_lote_sucursal,
                id_ubicacion_sucursal: id_ubicacion,
                cantidad,
                lote_factura_numero: item.lote_factura?.numero_lote ?? null,
                lote_factura_fecha: item.lote_factura?.fecha_caducidad
                    ? new Date(item.lote_factura.fecha_caducidad)
                    : null,
            });
        };

        const apartar = async (stock: Stock_Ubicacion_Lote, cantidad: number) => {
            await stock.update({
                cantidad_apartada: Number(stock.cantidad_apartada) + cantidad,
            }, { transaction });
        };

        // Renglones cuyo plan ya es una estantería se procesan primero y tal cual (apartan lo que
        // planearon); así lo que quede libre en estantería es lo que pueden usar los de tarima.
        const esEstanteria = async (item: LoteEntrada) => {
            if (!item.id_stock_ubicacion_lote) return false;
            const s = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: item.id_stock_ubicacion_lote },
                include: [{ model: Ubicacion_Sucursal, as: 'ubicacion', required: false, attributes: ['tipo_ubicacion'] }],
                transaction,
            });
            return !!s?.id_ubicacion_sucursal && (s as any).ubicacion?.tipo_ubicacion !== 'TARIMA';
        };
        const marcados = await Promise.all(lotes.map(async (item) => ({ item, est: await esEstanteria(item) })));
        const ordenados = [...marcados.filter(m => m.est), ...marcados.filter(m => !m.est)];

        for (const { item, est } of ordenados) {
            const pedido = Number(item.cantidad);
            if (!(pedido > 0)) continue;

            const planeada = item.id_stock_ubicacion_lote
                ? await Stock_Ubicacion_Lote.findOne({
                    where: { id_stock_ubicacion_lote: item.id_stock_ubicacion_lote },
                    transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined,
                })
                : null;

            if (est) {
                agregar(item, item.id_stock_ubicacion_lote, item.id_ubicacion_sucursal, pedido);
                if (planeada) await apartar(planeada, pedido);
                continue;
            }

            // El plan de surtido (hoja) apunta a la tarima. Si el surtidor ya sacó la caja y la dio de
            // salida a una ubicación (estantería), esas piezas ya tienen ubicación: se aparta de ahí
            // primero, y de la tarima solo lo que no alcance.

            const enEstanteria = (await Stock_Ubicacion_Lote.findAll({
                where: { id_lote: item.id_lote_sucursal, id_ubicacion_sucursal: { [Op.ne]: null } },
                include: [{
                    model: Ubicacion_Sucursal, as: 'ubicacion', required: true, attributes: ['id_ubicacion_sucursal'],
                    where: { tipo_ubicacion: { [Op.ne]: 'TARIMA' } },
                }],
                transaction, lock: transaction ? { level: transaction.LOCK.UPDATE, of: Stock_Ubicacion_Lote } : undefined,
            })).filter(s => libre(s) > 0 || s.id_stock_ubicacion_lote === planeada?.id_stock_ubicacion_lote);

            // La fila planeada primero (si ya es estantería), luego la que tenga más libre
            enEstanteria.sort((a, b) =>
                (b.id_stock_ubicacion_lote === planeada?.id_stock_ubicacion_lote ? 1 : 0)
                - (a.id_stock_ubicacion_lote === planeada?.id_stock_ubicacion_lote ? 1 : 0)
                || libre(b) - libre(a));

            let restante = pedido;
            for (const s of enEstanteria) {
                if (restante <= 0) break;
                const tomar = Math.min(Math.max(libre(s), 0), restante);
                if (tomar <= 0) continue;
                agregar(item, s.id_stock_ubicacion_lote, s.id_ubicacion_sucursal, tomar);
                await apartar(s, tomar);
                restante -= tomar;
            }

            if (restante > 0) {
                // Lo que no cubrió la estantería se aparta donde el plan lo dijo (comportamiento original)
                agregar(item, item.id_stock_ubicacion_lote, item.id_ubicacion_sucursal, restante);
                if (planeada) await apartar(planeada, restante);
            }
        }

        if (rows.length === 0) throw new Error("No hay lotes válidos con cantidad mayor a 0");

        return await Detalle_Pedido_Almacen_Lote.bulkCreate(rows, {
            transaction,
            validate: true,
        });
    },


};
