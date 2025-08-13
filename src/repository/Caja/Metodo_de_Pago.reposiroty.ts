import Metodo_de_Pago from "../../models/Caja/Metodo_de_Pago";
import { isUUID } from "../../utils/validaciones";
import { IMetodoPago, ICreateOrUpdateMetodoPago, IMetodoPagoVentaInput } from "../../interface/Caja/Metodo_de_Pago.interface";
import { v4 as uuidv4 } from "uuid";

export const MetodoPagoRepository = {

    getAll: async () => {
        return await Metodo_de_Pago.findAll();
    },

    getByIDFlexible: async (id_metodo_pago: string) => {
        if (isUUID(id_metodo_pago)) {
            return await Metodo_de_Pago.findByPk(id_metodo_pago);
        } else {
            return await Metodo_de_Pago.findOne({
                where: {
                    clave_metodo_pago: id_metodo_pago
                }
            });
        }
    },

    create: async (data: ICreateOrUpdateMetodoPago) => {
        return await Metodo_de_Pago.create({
            id_metodo_pago: uuidv4(),
            ...data
        });
    },

}