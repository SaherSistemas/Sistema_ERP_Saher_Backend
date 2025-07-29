import { UUID } from "crypto";
import MonederoCliente from "../../../models/Clientes/Monedero/Monedero";
import { IMonedero, ICreateOrUpdateMonedero} from "../../../interface/Clientes/Monedero/Modenero.interface";
import { v4 as uuidv4 } from "uuid";
import { Op, literal } from "sequelize";
import { isUUID } from "../../../utils/validaciones";
import Cliente from "../../../models/Clientes/Cliente";

export const MonederoRepository = {
    getAll:async () => {
        return await MonederoCliente.findAll();
    },
    
    getByCliente: async (id_cliente: string) => {
        return await MonederoCliente.findOne({ where: { id_cliente } });
    },

    getByIDFlexible: async (id_monedero : string) =>{
        if(isUUID(id_monedero)){
            return await MonederoCliente.findByPk(id_monedero)
        } else{
            return await MonederoCliente.findAll({
              where : {
                [Op.or] : [
                     { id_cliente: id_monedero },
                ]
              }  
            })
        }
    },
   createMonedero: async (data: ICreateOrUpdateMonedero) => {
  const clienteExiste = await Cliente.findByPk(data.id_cliente?.trim());
  if (!clienteExiste) {
    throw new Error("El cliente no existe");
  }
  if (!data.fecha_creacion || !data.fecha_expiro) {
    throw new Error("Fechas incompletas para crear el monedero.");
  }

  return await MonederoCliente.create({
    id_monedero: uuidv4(),
    saldo_monedero: 0,
    id_cliente: data.id_cliente.trim(),
    fecha_creacion: new Date(data.fecha_creacion),
    fecha_expiro: new Date(data.fecha_expiro),
  });
},
    deleteMonedero: async (id_monedero: string) => {
        if (!isUUID(id_monedero)) {
        throw new Error("El id_monedero proporcionado no es válido");
        }

        const monedero = await MonederoCliente.findByPk(id_monedero);
        if (!monedero) {
        throw new Error(`No existe un monedero con id: ${id_monedero}`);
        }

        await MonederoCliente.destroy({ where: { id_monedero } });

        return { message: `Monedero con id ${id_monedero} eliminado correctamente.` };
  }
  
}
