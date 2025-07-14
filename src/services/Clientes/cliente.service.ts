import { ICliente, ICreateUpdateCliente} from "../../interface/Clientes/Cliente.interface"
import { ClienteRepository } from "../../repository/Clientes/Cliente.repository";
import { TipoClienteRepository } from "../../repository/Clientes/Tipo_Cliente.repository";
import { ColoniaRepository } from "../../repository/Lugares/Colonia.respository";


export const ClienteService = {

    getAll:async () => {
        return await ClienteRepository.getAll();
    },

    getByIDFlexible: async(identificador_cliente  : string ) => {
        return await ClienteRepository.getByIDFlexible(identificador_cliente );
    },

    createCliente: async(data:ICliente) =>{
        if(!data.id_tipo_cliente || !TipoClienteRepository.getByIDFlexible(data.id_tipo_cliente)){
            data.id_tipo_cliente = "94b4c283-3cd6-4776-a0f6-40730ebb6107";
        }
        return await ClienteRepository.createCliente(data);
    },

    updateCliente: async(id_cliente_o_telefono: string, data: ICreateUpdateCliente) => {
        return await ClienteRepository.updateCliente(id_cliente_o_telefono, data);
    },
    updateStatusCliente: async(id_cliente: string) => {
        return await ClienteRepository.updateStatusCliente(id_cliente);
    }

}