import { UUID } from "crypto";
import Beneficio_Cliente from "../../models/Clientes/Beneficio_Cliente"; 
import { isUUID } from "../../utils/validaciones";
import { IBeneficioCliente } from "../../interface/Clientes/Beneficio_Cliente.interface";
import { v4 as uuidv4 } from "uuid";


export const BeneficioClienteRepository = {
    getAll:async () => {
        return await Beneficio_Cliente.findAll();},

    createBeneficioCliente: async(data:IBeneficioCliente) =>{
        return await Beneficio_Cliente.create({
            id_beneficio: uuidv4(),
            ...data
        });
    },
}