// src/modules/Inventario/Ubicaciones/repository/Articulo_Ubicacion_Default.repository.ts
import { Transaction } from "sequelize";
import Articulo_Ubicacion_Default from "../model/Articulo_Ubicacion_Default";
import Ubicacion_Sucursal from "../../Ubicaciones/model/Ubicacion_Sucursal";

export const Articulo_Ubicacion_DefaultRepository = {

    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {
        return await Articulo_Ubicacion_Default.findAll({
            attributes: ["id_articulo_ubicacion_default", "id_articulo", "id_empresa_sucursal"],
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
        return await Articulo_Ubicacion_Default.findOne({
            where: { id_empresa_sucursal, id_ubicacion_sucursal },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
        });
    },

    create: async (
        data: { id_empresa_sucursal: string; id_articulo: string; id_ubicacion_sucursal: string },
        t?: Transaction
    ) => {
        return await Articulo_Ubicacion_Default.create(data as any, { transaction: t });
    },

    updateUbicacion: async (id_ubicacion_articulo: string, id_ubicacion_sucursal: string, t?: Transaction) => {
        await Articulo_Ubicacion_Default.update(
            { id_ubicacion_sucursal },
            { where: { id_ubicacion_articulo }, transaction: t }
        );
        return await Articulo_Ubicacion_Default.findByPk(id_ubicacion_articulo, { transaction: t });
    },
};
