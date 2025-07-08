import { ITipoCliente } from "../../interface/Clientes/Tipo_Cliente.interface"; 
import { TipoClienteRepository } from "../../repository/Clientes/Tipo_Cliente.repository"; 


export const TipoClienteService = {

    getAll:async () => {
        return await TipoClienteRepository.getAll();
    },
    createCliente: async(data:ITipoCliente) =>{
        return await TipoClienteRepository.createTipoCliente(data);
    },

}