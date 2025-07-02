import { ICliente, ICreateUpdateCliente} from "../../interface/VentaMostrador/Cliente.interface"
import { ClienteRepository } from "../../repository/VentaMostrador/Cliente.repository";


export const ClienteService = {

    getAll:async () => {
        return await ClienteRepository.getAll();
    },

    getByIDFlexible: async(id_cliente_o_telefono : string ) => {
        return await ClienteRepository.getByIDFlexible(id_cliente_o_telefono);
    },

    createCliente: async(data:ICliente) =>{
        return await ClienteRepository.createCliente(data);
    },

    updateCliente: async(id_cliente_o_telefono: string, data: ICreateUpdateCliente) => {
        return await ClienteRepository.updateCliente(id_cliente_o_telefono, data);
    },
    updateStatusCliente: async(id_cliente: string) => {
        return await ClienteRepository.updateStatusCliente(id_cliente);
    }

}