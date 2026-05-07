import { ICreateTrabajoImpresion } from "../interface/TrabajoImpresion.interface";
import Impresora from "../model/Impresora";

export const ImpresoraRepository = {


    getImpresora: async (id_empresa: string, estacion: string) => {
        // Aquí deberías implementar la lógica para obtener la impresora asignada a la estación y empresa
        const impresora = await Impresora.findOne({
            where: {
                id_sucursal: id_empresa,
                estacion
            }
        });
        if (!impresora) throw new Error(`No hay impresora configurada para la estación "${estacion}"`);
        return impresora.id_impresora;

    },


};
