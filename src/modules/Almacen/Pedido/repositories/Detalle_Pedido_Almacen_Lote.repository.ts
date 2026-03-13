import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { ICreateDetallePedidoAlmacenLote } from '../interface/Detalle_Pedido_Almacen_Lote.interface';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';


export const Detalle_Pedido_Almacen_LoteRepository = {
    create: async (
        data: ICreateDetallePedidoAlmacenLote,
        transaction?: Transaction
    ) => {
        const { id_detalle_pedido, lotes } = data;

        if (!id_detalle_pedido) throw new Error("id_detalle_pedido es requerido");
        //  console.log(data)
        if (!Array.isArray(lotes) || lotes.length === 0) throw new Error("Debes enviar al menos un lote");

        const rows = lotes
            .filter((item) => Number(item.cantidad) > 0)
            .map((item) => ({
                id_detalle_pedido_almacen_lote: uuidv4(),
                id_detalle_pedido_almacen: id_detalle_pedido,
                id_stock_ubicacion_lote: item.id_stock_ubicacion_lote,
                id_lote_sucursal: item.id_lote_sucursal,
                id_ubicacion_sucursal: item.id_ubicacion_sucursal,
                cantidad: Number(item.cantidad),
            }));

        if (rows.length === 0) throw new Error("No hay lotes válidos con cantidad mayor a 0");

        // 1. Guardar los lotes del pedido
        const created = await Detalle_Pedido_Almacen_Lote.bulkCreate(rows, {
            transaction,
            validate: true,
        });

        // 2. Descontar stock por cada lote
        for (const row of rows) {
            const stock = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: row.id_stock_ubicacion_lote },
                transaction,
                lock: true, // 👈 bloquea el row para evitar condiciones de carrera
            });


            await stock.update({ cantidad_apartada: row.cantidad }, { transaction });
        }

        return created;
    },


};
