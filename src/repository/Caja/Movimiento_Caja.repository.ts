import Movimiento_Caja from "../../models/Caja/Movimiento_Caja";
import { isUUID } from "../../utils/validaciones";
import { IMovimientoCaja } from "../../interface/Caja/Movimiento_Caja.interface";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "sequelize";
import e from "express";
import Empleado from "../../modules/RRHH/model/Empleado";

export const MovimientoCajaRepository = {
    getAll: async () => {
        return await Movimiento_Caja.findAll();
    },

    getAllByCaja: async (id_caja: string) => {
        return await Movimiento_Caja.findAll({
            where: { id_caja },
            order: [["createdAt", "ASC"]]
        });
    },

    getAllByCorte: async (id_corte: string) => {
        return await Movimiento_Caja.findAll({
            include: [
                {
                    model: Empleado,
                    as: 'empleado',
                    attributes: ['nombre_empleado', 'ap_pat_empleado']
                }
            ],
            where: { id_corte },
            order: [["createdAt", "DESC"]]
        });
    },


    getByIDFlexible: async (id_movimiento: string) => {
        if (isUUID(id_movimiento)) {
            return await Movimiento_Caja.findByPk(id_movimiento);
        } else {
            return await Movimiento_Caja.findOne({
                where: {
                    concepto_movimiento: id_movimiento
                }
            });
        }
    },

    create: async (data: IMovimientoCaja, options?: { transaction?: Transaction }) => {
        return await Movimiento_Caja.create({
            id_movimiento: uuidv4(),
            ...data
        }, options);
    },

    updateMovimientoCaja: async (id_movimiento: string, data: IMovimientoCaja) => {
        return await Movimiento_Caja.update(data, {
            where: { id_movimiento }
        });
    }

}
