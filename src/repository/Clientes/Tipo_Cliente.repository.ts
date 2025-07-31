import { UUID } from "crypto";
import Tipo_Cliente from "../../models/Clientes/Tipo_Cliente";
import { isUUID } from "../../utils/validaciones";
import { ITipoCliente, ICreateOrUpdateTipoCliente } from "../../interface/Clientes/Tipo_Cliente.interface";
import { v4 as uuidv4 } from "uuid"; 

export const TipoClienteRepository = {
    
    getAll:async () => {
    return await Tipo_Cliente.findAll();
    },

    createTipoCliente: async(data:ICreateOrUpdateTipoCliente) =>{
        return await Tipo_Cliente.create({
            id_tipo_cliente: uuidv4(),
            ...data
        });
    },

    getByIDFlexible: async(id_tipo_cliente_o_nombre : string ) => {
        if(isUUID(id_tipo_cliente_o_nombre)){
            return await Tipo_Cliente.findByPk(id_tipo_cliente_o_nombre )
        }else{
            return await Tipo_Cliente.findOne({
                where:{
                    nom_tipo_cliente:id_tipo_cliente_o_nombre
                }
            })
        }
    },
}