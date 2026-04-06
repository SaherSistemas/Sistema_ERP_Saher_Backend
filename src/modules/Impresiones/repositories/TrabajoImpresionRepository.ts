import { ICreateTrabajoImpresion } from "../interface/TrabajoImpresion.interface";
import Trabajo_Impresion from "../model/Trabajo_Impresion";

export const TrabajoImpresionRepository = {


    create: async (data: ICreateTrabajoImpresion) => {
        const trabajo = await Trabajo_Impresion.create({ ...data });
        return trabajo;
    },


};
