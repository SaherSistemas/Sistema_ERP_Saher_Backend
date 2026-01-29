
import { v4 as uuidv4 } from 'uuid';
import { fn, literal, Op, Transaction } from 'sequelize';
import Stock_Ubicacion_Lote from '../model/Stock_Ubicacion_Lote';

export const Stock_Ubicacion_LoteRepository = {
    findOneByUbicacionYLote: async (id_ubicacion_sucursal: string, id_lote: string, tx?: Transaction) =>
        Stock_Ubicacion_Lote.findOne({
            where: { id_ubicacion_sucursal, id_lote },
            transaction: tx,
            lock: tx ? tx.LOCK.UPDATE : undefined,
        }),

    // Acumula si existe; si no, crea
    upsertAcumular: async (
        data: {
            id_ubicacion_sucursal: string;
            id_articulo: string;
            id_lote: string;
            cantidad: number;
            cantidad_apartada?: number;
        },
        tx: Transaction
    ) => {
        const existente = await Stock_Ubicacion_LoteRepository.findOneByUbicacionYLote(
            data.id_ubicacion_sucursal,
            data.id_lote,
            tx
        );

        if (existente) {
            existente.cantidad = (existente.cantidad ?? 0) + data.cantidad;
            if (typeof data.cantidad_apartada === "number") {
                existente.cantidad_apartada = (existente.cantidad_apartada ?? 0) + data.cantidad_apartada;
            }
            await existente.save({ transaction: tx });
            return existente;
        }

        return await Stock_Ubicacion_Lote.create(
            {
                id_ubicacion_sucursal: data.id_ubicacion_sucursal,
                id_articulo: data.id_articulo,
                id_lote: data.id_lote,
                cantidad: data.cantidad,
                cantidad_apartada: data.cantidad_apartada ?? 0,
            } as any,
            { transaction: tx }
        );
    },

    getStockByUbicacion: async (id_ubicacion_sucursal: string) =>
        Stock_Ubicacion_Lote.findAll({
            where: { id_ubicacion_sucursal },
            order: [["createdAt", "DESC"]],
        }),

    // Para regla “estantería solo 1 artículo”: detectar si ya hay stock de otro artículo
    getDistinctArticuloIdsInUbicacion: async (id_ubicacion_sucursal: string, tx?: Transaction) => {
        const rows = await Stock_Ubicacion_Lote.findAll({
            where: { id_ubicacion_sucursal },
            attributes: ["id_articulo"],
            group: ["id_articulo"],
            transaction: tx,
        });
        return rows.map(r => r.id_articulo);
    },
};
