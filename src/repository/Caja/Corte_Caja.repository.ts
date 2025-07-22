
import { UUID } from "crypto";
import CorteCaja from "../../models/Caja/Corte_Caja";
import { isUUID } from "../../utils/validaciones";
import { ICorteCaja, ICorteCajaCreate, ICorteCajaUpdate } from "../../interface/Caja/Corte_Caja.interface"; 
import { v4 as uuidv4 } from "uuid";
import { get } from "http";
import Empleado from "../../models/Usuarios/Empleado";
import Articulo from "../../models/Articulos/Articulo";

export const CorteCajaRepository = {
    getAll: async () => {
        return await CorteCaja.findAll();
    },

    getByIDFlexible: async (id_corte: string) => {
    //     const include = [
    //     { model: Empleado, as: 'empleado_apertura', attributes: ['id_empleado', 'nombre_empleado'] },
    //     { model: Empleado, as: 'empleado_cierre', attributes: ['id_empleado', 'nombre_empleado'] },
    // ];
        if (isUUID(id_corte)) {
            return await CorteCaja.findByPk(id_corte);
        } else {
            return await CorteCaja.findOne({
                where: { id_caja: id_corte }
            });
        }
    },

    
    getCantidadCortesPorCaja: async (id_caja: string) => {
        return await CorteCaja.count({
            where: { id_caja }
        });
    },
  
    createCorteCaja: async (data: ICorteCajaCreate) => {
        return await CorteCaja.create({
            id_corte: uuidv4(),
            fecha_apertura : new Date,
            status_corte: true,
            id_caja:data.id_caja,
            id_usuario_apertura:data.id_usuario_apertura

        });

    },

   updateCierreCorteCaja: async (id_corte: string, data: ICorteCajaUpdate) => {
    if (!id_corte) throw new Error('id_corte es undefined');

    const dataActualizada = {
        ...data,
        fecha_cierre: new Date(),
        status_corte: false,

    };

    return await CorteCaja.update(dataActualizada, {
        where: { id_corte }
    });
},



    updateCorteCaja: async (id_corte: string, data: ICorteCaja) => {
        return await CorteCaja.update(data, {
            where: { id_corte }
        });
    },
};