// src/modules/Inventario/Ubicaciones/repository/Ubicacion_Articulo.repository.ts
import { Transaction } from "sequelize";
import Ubicacion_Articulo from "../model/Ubicacion_Articulo";
import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";

export const Ubicacion_ArticuloRepository = {
    findByArticulo: async (id_empresa_sucursal: string, id_articulo: string, t?: Transaction) => {
        return await Ubicacion_Articulo.findOne({
            where: { id_empresa_sucursal, id_articulo },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
        });
    },
    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {
        return await Ubicacion_Articulo.findAll({
            attributes: ["id_ubicacion_articulo", "id_articulo", "id_empresa_sucursal"],
            where: {
                id_empresa_sucursal,
                id_articulo,
            },
            include: [
                {
                    model: Ubicacion_Sucursal,
                    attributes: ["id_ubicacion_sucursal", "tipo_ubicacion", "tarima_ub", "pasillo_ub", "anaquel_ub", "nivel_ub", "posicion_ub"],
                }]
        })
    },
    findByUbicacion: async (id_empresa_sucursal: string, id_ubicacion_sucursal: string, t?: Transaction) => {
        return await Ubicacion_Articulo.findOne({
            where: { id_empresa_sucursal, id_ubicacion_sucursal },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
        });
    },

    create: async (
        data: { id_empresa_sucursal: string; id_articulo: string; id_ubicacion_sucursal: string },
        t?: Transaction
    ) => {
        return await Ubicacion_Articulo.create(data as any, { transaction: t });
    },

    updateUbicacion: async (id_ubicacion_articulo: string, id_ubicacion_sucursal: string, t?: Transaction) => {
        await Ubicacion_Articulo.update(
            { id_ubicacion_sucursal },
            { where: { id_ubicacion_articulo }, transaction: t }
        );
        return await Ubicacion_Articulo.findByPk(id_ubicacion_articulo, { transaction: t });
    },
};
