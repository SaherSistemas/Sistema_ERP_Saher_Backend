import { ICreateOrUpdateVentaPago } from "../../interface/Venta/Venta_Pago.interface";
import Metodo_de_Pago from "../../models/Caja/Metodo_de_Pago";
import Venta_Pago from "../../models/Venta/Venta_Pago";
import { CreateOptions } from "sequelize";
import { v4 as uuidv4 } from "uuid";

export const VentaPagoRepository = {
  getAll:async () => {
    return await Venta_Pago.findAll();
  }
  ,

  getById: async (id: string) => {
  return await Venta_Pago.findOne({
    where: { id_venta_pago: id }, 
    include: [
      {
        model: Metodo_de_Pago,
        as: 'metodo_pago',
        attributes: ['nombre_metodo_pago'] 
      }
    ]
  });
},

  create: async (data: ICreateOrUpdateVentaPago, options?: CreateOptions) => {
  return await Venta_Pago.create(
    {
      id_venta_pago: uuidv4(),
      ...data
    },
    options 
  );
}
};
