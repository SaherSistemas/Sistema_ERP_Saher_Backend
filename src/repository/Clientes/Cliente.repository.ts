import { UUID } from "crypto";
import Cliente from "../../models/Clientes/Cliente";
import { isUUID } from "../../utils/validaciones";
import { ICliente, ICreateUpdateCliente } from "../../interface/Clientes/Cliente.interface";
import { v4 as uuidv4 } from "uuid";

export const ClienteRepository = {

        getAll:async () => {
            return await Cliente.findAll();
        },

    getByIDFlexible: async(id_cliente_o_telefono : string ) => {
        if(isUUID(id_cliente_o_telefono)){
        return await Cliente.findByPk( id_cliente_o_telefono )
        }else{

        return await Cliente.findOne({
            where:{
                 telefono_cliente:id_cliente_o_telefono
            }
        })}
    },
    createCliente: async(data:ICliente) =>{
        return await Cliente.create({
            id_cliente: uuidv4(),
            ...data
        });
    },
    updateCliente: async(id_cliente: string, data: ICreateUpdateCliente) => {
        return await Cliente.update(data, {
            where: { id_cliente }
        });
    },

    updateStatusCliente: async(id_cliente: string) => {
       const cliente = await ClienteRepository.getByIDFlexible(id_cliente);
       let statusActualCliente = cliente?.status_cliente;
        statusActualCliente =! statusActualCliente;
        console.log(statusActualCliente)
        return await cliente.update({
            status_cliente:statusActualCliente
        })
    }



}