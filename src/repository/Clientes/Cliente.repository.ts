import { UUID } from "crypto";
import Cliente from "../../models/Clientes/Cliente";
import { isUUID } from "../../utils/validaciones";
import { ICliente, ICreateUpdateCliente } from "../../interface/Clientes/Cliente.interface";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
export const ClienteRepository = {

        getAll:async () => {
            return await Cliente.findAll();
        },

        getByIDFlexible: async(identificador_cliente : string ) => {
        if(isUUID(identificador_cliente)){
        return await Cliente.findByPk( identificador_cliente )
        }else{

        return await Cliente.findOne({
            where:{
                [Op.or] : [
                { telefono_cliente: identificador_cliente },
                { nombre_cliente: { [Op.like]: `%${identificador_cliente}%` } },
                { apelliapellido_pat_cliente: { [Op.like]: `%${identificador_cliente}%` } },
                { apelliapellido_mat_cliente: { [Op.like]: `%${identificador_cliente}%` } }
                ]
            }
        });
    }
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