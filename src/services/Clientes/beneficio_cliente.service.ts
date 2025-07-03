import { IBeneficioCliente } from "../../interface/Clientes/Beneficio_Cliente.interface"; 
import { BeneficioClienteRepository } from "../../repository/Clientes/BeneficioCliente.repository";



export const BeneficioClienteService = {

    getAll:async () => {
        return await BeneficioClienteRepository.getAll();
    },
    createBeneficio: async(data:IBeneficioCliente) =>{
        return await BeneficioClienteRepository.createBeneficioCliente(data);
    },

}