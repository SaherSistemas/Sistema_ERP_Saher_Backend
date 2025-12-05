import { promises } from "dns";
import { ICliente, ICreateUpdateCliente } from "../../interface/Clientes/Cliente.interface"
import { ClienteRepository } from "../../repository/Clientes/Cliente.repository";
import { TipoClienteRepository } from "../../repository/Clientes/Tipo_Cliente.repository";
import { ColoniaRepository } from "../../repository/Lugares/Colonia.respository";
import Cliente from "../../models/Clientes/Cliente";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import dayjs from "dayjs";
import { MonederoRepository } from "../../repository/Clientes/Monedero/Monedero.repository";
import { dbLocal } from "../../config/db";


export const ClienteService = {

    getAll: async () => {
        return await ClienteRepository.getAll();
    },

    getByIDFlexible: async (identificador_cliente: string) => {
        return await ClienteRepository.getByIDFlexible(identificador_cliente);
    },

    createCliente: async (data: ICliente) => {
        const t = await dbLocal.transaction();
        try {
            if (!data.id_tipo_cliente && !data.id_lista_precio) {
                data.id_lista_precio = "e3b85da4-6ec9-440d-983e-e060d69dc6b1";
                data.id_tipo_cliente = "d2a20360-ae70-4271-8929-2d8d0a26c896";
            }

            const nuevoCliente = await ClienteRepository.createCliente(
                data,
                { transaction: t }
            );

            await MonederoRepository.createMonedero(
                {
                    id_cliente: nuevoCliente.id_cliente,
                    saldo_monedero: 0,
                    activo: true,
                    fecha_creacion: new Date(),
                    fecha_expiro: dayjs().add(1, 'year').toDate(),
                },
                { transaction: t }
            );

            await t.commit();
            return nuevoCliente;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    getDatosBeneficiado: async (telefono_cliente: string) => {
        const cliente = await ClienteRepository.getDatosBeneficiado(telefono_cliente);
        return cliente;
    },


    updateCliente: async (id_cliente: string, data: ICreateUpdateCliente) => {

        const cliente = await ClienteRepository.getByIDFlexible(id_cliente);

        if (!cliente) {
            return { error: "Cliente no encontrado", status: 404 };
        }

        await ClienteRepository.updateCliente(id_cliente, data);

        return {
            mensaje: "Cliente actualizado correctamente",
            status: 200
        };
    }


}