
import { v4 as uuidv4 } from 'uuid';
import { col, fn, literal, Op, QueryTypes, Transaction } from 'sequelize';
import Stock_Ubicacion_Lote from '../model/Stock_Ubicacion_Lote';
import { dbLocal } from '../../../../config/db';
import { CrearStockUbicacionLoteDTO, StockUpsertRow } from '../interface/Stock_Ubicacion_Lote.interface';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import LoteArticuloSucursal from '../../Lotes/model/Lote_Articulo_Sucursal';

export const Stock_Ubicacion_LoteRepository = {
    findOneByUbicacionYLote: async (id_ubicacion_sucursal: string, id_lote: string, tx?: Transaction) =>
        Stock_Ubicacion_Lote.findOne({
            where: { id_ubicacion_sucursal, id_lote },
            transaction: tx,
            lock: tx ? tx.LOCK.UPDATE : undefined,
        }),

    // Acumula si existe; si no, crea
    bulkUpsertAcumular: async (rows: StockUpsertRow[], tx: Transaction) => {
        if (!rows?.length) return;
        // console.log(rows)
        // Normaliza números
        const payload = rows
            .map(r => ({
                ...r,
                cantidad: Number(r.cantidad ?? 0),
                cantidad_apartada: Number(r.cantidad_apartada ?? 0),
            }))
            .filter(r => r.cantidad !== 0 || r.cantidad_apartada !== 0);

        if (payload.length === 0) return;
        const created = await Stock_Ubicacion_Lote.bulkCreate(payload, {
            transaction: tx,
        });
        return created
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
    findPendientesDeAcomodo: async (id_empresa_sucursal: string, cb?: string, tx?: Transaction) => {
        const whereStock: any = {
            id_empresa_sucursal,
            id_ubicacion_sucursal: { [Op.is]: null }, // pendientes
        };

        const includeArticulo: any = {
            model: Articulo,
            attributes: ["id_artic", "cod_barr_artic", "des_artic"],
        };

        if (cb && cb.trim()) {
            includeArticulo.where = {
                cod_barr_artic: { [Op.iLike]: `%${cb.trim()}%` }, // ✅ contiene
            };
            includeArticulo.required = true; // ✅ INNER JOIN cuando hay filtro
        }

        const stock_ubicacion_lote = await Stock_Ubicacion_Lote.findAll({
            where: whereStock,
            transaction: tx,
            include: [
                includeArticulo,
                {
                    model: LoteArticuloSucursal,
                    attributes: [
                        "id_lote_sucursal",
                        "numero_lote_sucursal",
                        "fecha_venci_lote_sucursal",
                        "cantidad_entrada_lote",
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        return stock_ubicacion_lote;
    },
    getExistenciasPorUbicacion: (
        id_empresa_sucursal: string,
        id_articulo: string,
        idsUbicaciones: string[]
    ) => {
        if (!idsUbicaciones.length) return [];

        return Stock_Ubicacion_Lote.findAll({
            attributes: [
                "id_ubicacion_sucursal",
                [fn("SUM", col("cantidad")), "existencia"],
            ],
            where: {
                id_empresa_sucursal,
                id_articulo,
                id_ubicacion_sucursal: { [Op.in]: idsUbicaciones },
            },
            group: ["id_ubicacion_sucursal"],
            raw: true,
        });
    },
    getExistenciasTotalesPorUbicacion: (
        id_empresa_sucursal: string,
        idsUbicaciones: string[]
    ) => {
        if (!idsUbicaciones.length) return [];

        return Stock_Ubicacion_Lote.findAll({
            attributes: [
                "id_ubicacion_sucursal",
                [fn("SUM", col("cantidad")), "existencia"],
            ],
            where: {
                id_empresa_sucursal,
                id_ubicacion_sucursal: { [Op.in]: idsUbicaciones },
            },
            group: ["id_ubicacion_sucursal"],
            raw: true,
        });
    },


    /*NUEVO */
    findByIdForUpdate: async (
        id_empresa_sucursal: string,
        id_stock_ubicacion_lote: string,
        tx: Transaction
    ) => {
        return Stock_Ubicacion_Lote.findOne({
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
    },

    updateUbicacionYCantidad: async (
        id_empresa_sucursal: string,
        id_stock_ubicacion_lote: string,
        patch: { id_ubicacion_sucursal: string; cantidad: number },
        tx: Transaction
    ) => {
        await Stock_Ubicacion_Lote.update(patch, {
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
        });

        return Stock_Ubicacion_Lote.findOne({
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
        });
    },

    create: async (dto: CrearStockUbicacionLoteDTO, tx: Transaction) => {
        if (!dto.id_lote) throw new Error("id_lote requerido");
        return Stock_Ubicacion_Lote.create(
            {
                id_empresa_sucursal: dto.id_empresa_sucursal,
                id_articulo: dto.id_articulo,
                id_lote: dto.id_lote,
                id_ubicacion_sucursal: dto.id_ubicacion_sucursal,
                cantidad: dto.cantidad,
                cantidad_apartada: dto.cantidad_apartada ?? 0,
            },
            { transaction: tx }
        );
    },
};
