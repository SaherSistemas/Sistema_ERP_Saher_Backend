import { v4 as uuidv4 } from "uuid";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";


export const AcomodoServices = {
    obtenerPendientesAcomodo: async (id_empresa_sucursal: string, cb?: string) => {
        return await Stock_Ubicacion_LoteRepository.findPendientesDeAcomodo(id_empresa_sucursal, cb);
    },


};
