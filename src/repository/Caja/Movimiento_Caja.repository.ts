import { UUID } from "crypto";
import Movimiento_Caja from "../../models/Caja/Movimiento_Caja";
import { isUUID } from "../../utils/validaciones";
import { IMovimientoCaja } from "../../interface/Caja/Movimiento_Caja.interface";
import { v4 as uuidv4 } from "uuid";
import { get } from "http";

export const MovimientoCajaRepository = {
    getAll: async () => {
        return await Movimiento_Caja.findAll();
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

    createMovimientoCaja: async (data: IMovimientoCaja) => {
        return await Movimiento_Caja.create({
            id_movimiento: uuidv4(),
            ...data
        });
    },
    
    updateMovimientoCaja: async (id_movimiento: string, data: IMovimientoCaja) => {
        return await Movimiento_Caja.update(data, {
            where: { id_movimiento }
        });
    }

}
