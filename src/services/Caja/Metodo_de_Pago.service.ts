import { ICreateOrUpdateMetodoPago, IMetodoPago, IMetodoPagoVentaInput } from "../../interface/Caja/Metodo_de_Pago.interface";
import { MetodoPagoRepository  } from "../../repository/Caja/Metodo_de_Pago.reposiroty";


export const MetodoPagoService = {

    getAll: async () => {
        return await MetodoPagoRepository.getAll();
    },

    getByIDFlexible: async (id_metodo_pago: string) => {
        return await MetodoPagoRepository.getByIDFlexible(id_metodo_pago);
    },

    createMetodoPago: async (data: ICreateOrUpdateMetodoPago) => {
         return await MetodoPagoRepository.create(data);
    },
}
