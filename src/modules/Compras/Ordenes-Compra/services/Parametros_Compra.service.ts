import { iParametros_Compra, ICreateOrUpdateParametros_Compra } from "../interface/Parametros_Compra/Parametros_Compra.interface";
import { Parametros_CompraRepository } from "../repositories/Parametros_Compra.repository";


export const Parametros_CompraService = {
    getAll: async () => {
        return await Parametros_CompraRepository.getAll();
    },

    createParametro: async (data: ICreateOrUpdateParametros_Compra) => {
        return await Parametros_CompraRepository.createParametroCompra(data);
    },
    getByID: async (id: string) => {
        return await Parametros_CompraRepository.getByID(id)
    },
    getByIDEmpresa: async (idEmpresa: string) => {
        return await Parametros_CompraRepository.getByIDEmpresa(idEmpresa)
    },
    ventasEnEmpresasVigiladas: async (idEmpresaCompra: string, idsArticulos: string[]) => {
        return await Parametros_CompraRepository.ventasEnEmpresasVigiladas(idEmpresaCompra, idsArticulos)
    },
    updateParametro: async (id: string, data: ICreateOrUpdateParametros_Compra) => {
        return await Parametros_CompraRepository.updateParametroCompra(id, data)
    },

}