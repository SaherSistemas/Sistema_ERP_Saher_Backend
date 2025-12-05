import { Transaction } from "sequelize";
import MovimientoMonederoCliente from "../../../models/Clientes/Monedero/Movimiento_Monedero";
import { v4 as uuidv4 } from "uuid";
import { ICreateOrUpdateMovMonederoCliente } from "../../../interface/Clientes/Monedero/Movimiento_Monedero.interface";

export const MovimientoMonederoRepository = {
    getall: async (options?: { transaction?: Transaction }) => {
        return await MovimientoMonederoCliente.findAll(options);
    },

    getByMonedero: async (id_monedero: string) => {
        return await MovimientoMonederoCliente.findAll({
            where: { id_monedero },
            order: [["createdAt", "DESC"]],
        });
    },


    create: async (
        data: ICreateOrUpdateMovMonederoCliente,
        options?: { transaction?: Transaction }
    ) => {

        return await MovimientoMonederoCliente.create(
            {
                id_mov_monedero: uuidv4(),
                id_monedero: data.id_monedero,
                cantidad_mov: data.cantidad_mov,
                tipo_mov: data.tipo_mov,
                id_empre: data.id_empre,
                referencia: data.referencia ?? null,
                fecha_mov: data.fecha_mov ?? new Date(),
            },
            options
        );
    },

};
