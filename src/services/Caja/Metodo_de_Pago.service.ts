import { ICreateOrUpdateMetodoPago } from "../../interface/Caja/Metodo_de_Pago.interface";
import { MetodoPagoRepository } from "../../repository/Caja/Metodo_de_Pago.reposiroty";


const metodoPagoCache: Record<string, string> = {};
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



    getIdByClave: async (clave: string, transaction?: any): Promise<string> => {

        if (metodoPagoCache[clave]) {
            return metodoPagoCache[clave];
        }

        const metodo = await MetodoPagoRepository.getByClave(clave, transaction);

        if (!metodo) {
            throw new Error(`Método de pago con clave "${clave}" no existe en la BD.`);
        }

        metodoPagoCache[clave] = metodo.id_metodo_pago;

        return metodo.id_metodo_pago;
    },
}
