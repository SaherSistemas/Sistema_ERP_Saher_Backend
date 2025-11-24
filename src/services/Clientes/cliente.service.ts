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

    generarPDFListado: async (): Promise<Buffer> => {
        const clientes = await ClienteService.getAll();

        const doc = new PDFDocument({ margin: 30, size: 'letter' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));

        const drawEncabezadoTablaClientes = () => {
            const y = doc.y;
            doc.rect(20, y, 550, 20).fill('#E0E0E0')
            doc.fillColor('black').font('Helvetica-Bold').fontSize(10);

            doc.text('ID', 32, y + 5);                            // id_cliente
            doc.text('Nombre Completo', 80, y + 5);                        // nombre + apellidos
            doc.text('Teléfono', 180, y + 5);                     // telefono_cliente
            doc.text('Nacimiento', 260, y + 5);                   // fec_nac_cliente
            doc.text('Género', 340, y + 5);                       // genero_cliente
            doc.text('Correo', 400, y + 5);                       // email_cliente
            doc.text('Colonia', 500, y + 5);                      // Id_colonia
            doc.moveDown(1.5);
            doc.font('Helvetica');
        };

        //Encabezado
        doc.rect(0, 0, 612, 60).fill('#3C8DBC');
        doc.fillColor('white').fontSize(20).text('FARMACIA SAHER', 40, 20);
        doc.fillColor('black');
        doc.moveDown(2);
        doc.fontSize(14).text('Listado de Clientes', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Fecha de creacion: ${dayjs().format('DD/MM/YYYY')}`);
        doc.moveDown().moveTo(30, doc.y).lineTo(580, doc.y).strokeColor('#CCCCCC').stroke();
        doc.moveDown();

        drawEncabezadoTablaClientes();

        // Contenido
        for (const cliente of clientes) {
            const espacioNecesario = 25;

            if (doc.y + espacioNecesario > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                drawEncabezadoTablaClientes();
            }

            const startY = doc.y;

            const nombreCompleto = `${cliente.nombre_cliente} ${cliente.apellido_pat_cliente} ${cliente.apellido_mat_cliente ?? ''}`;

            doc.fontSize(8);
            doc.text(cliente.id_cliente, 32, startY, { width: 40 });
            doc.text(nombreCompleto, 80, startY, { width: 90 });
            doc.text(cliente.telefono_cliente, 180, startY, { width: 70 });
            doc.text(dayjs(cliente.fec_nac_cliente).format('DD/MM/YYYY'), 260, startY, { width: 70 });
            doc.text(cliente.genero_cliente, 340, startY, { width: 50 });
            doc.text(cliente.email_cliente || '-', 400, startY, { width: 90 });
            doc.text(cliente.id_colonia, 500, startY, { width: 60 });

            doc.moveDown(1);
        }

        //doc.end();

        return new Promise((resolve, reject) => {
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', (err) => {
                reject(err);
            });
            doc.end();
        });
    }

    // updateCliente: async(id_cliente_o_telefono: string, data: ICreateUpdateCliente) => {
    //     return await ClienteRepository.updateCliente(id_cliente_o_telefono, data);
    // },
    // updateStatusCliente: async(id_cliente: string) => {
    //     return await ClienteRepository.updateStatusCliente(id_cliente);
    // }

}