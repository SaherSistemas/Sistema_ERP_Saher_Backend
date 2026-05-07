import { Pedido_AlmacenRepository } from "../../Almacen/Pedido/repositories/Pedido_Almacen.repository";
import { ImpresoraRepository } from "../repositories/ImpresoraRepository";
import { TrabajoImpresionRepository } from "../repositories/TrabajoImpresionRepository";
import { ICreateTrabajoImpresion } from "../interface/TrabajoImpresion.interface";
import { Bulto_PedidoRepository } from "../../Almacen/Empaque/repositories/Bulto_Pedido.repository";
import Facturas from "../../Facturas/model/Facturas.model";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TrabajoImpresionService = {
    /**CHEQUEO */

    createTrabajoImpresion: async (id_pedido_alm: string, tipo_documento: string, estacion: string, id_empresa: string) => {
        let data: ICreateTrabajoImpresion;

        const id_impresora = await ImpresoraRepository.getImpresora(id_empresa, estacion);
        if (tipo_documento === 'PEDIDO_ALMACEN') {
            const pedido = UUID_REGEX.test(id_pedido_alm)
                ? await Pedido_AlmacenRepository.getByID(id_pedido_alm)
                : await Pedido_AlmacenRepository.getByCodInterno(id_pedido_alm);
            if (!pedido) throw new Error('Pedido no encontrado');

            data = {
                cod_interno_pedido: pedido.cod_int_pedido_alm,
                tipo_documento,
                id_impresora,
                payload: {
                    tipo: "escpos",
                    qr: {
                        datos: pedido.cod_int_pedido_alm,
                        tamano: 1,
                        correccion: "L",
                        alineacion: "centro",
                    }
                }
            };
        }
        if (tipo_documento === 'BULTO') {
            const info = await Bulto_PedidoRepository.getInfoPedidoParaBulto(id_pedido_alm);

            data = {
                cod_interno_pedido: info.cod_int_pedido_alm,
                tipo_documento: 'BULTO',
                id_impresora,
                payload: {
                    tipo: 'escpos',
                    comandos: [
                        { type: 'align', value: 'center' },
                        { type: 'text', value: 'Emisor  FARMACIAS SAHER DE SINALOA S DE RL DE CV' },
                        { type: 'text', value: '------------------------------------------------------------------------' },

                        { type: 'align', value: 'left' },
                        { type: 'text', value: 'Destinatario' },
                        { type: 'text', value: `Razon Social:   ${info.razon_social_cliente}`, bold: true },
                        { type: 'text', value: `Nom Comercial:  ${info.nom_corto_cliente}`,    bold: true },

                        { type: 'feed', value: 1 },

                        { type: 'text', value: `Fact.:     ${info.fecha_facturado ?? 'Sin fecha'}` },
                        { type: 'text', value: `No. Pedido: ${info.cod_int_pedido_alm}` },

                        { type: 'feed', value: 1 },

                        { type: 'align',   value: 'center' },
                        { type: 'barcode', symbology: 'CODE128', value: info.cod_bulto, height: 60 },

                        { type: 'text', value: info.cod_int_pedido_alm, bold: true, size: 2 },

                        { type: 'feed', value: 1 },

                        { type: 'text', value: `Bultos:  ${info.num_bulto} de ${info.total_bulto}`, bold: true },

                        { type: 'feed', value: 1 },

                        { type: 'align', value: 'left' },
                        { type: 'text', value: `Surtido:   ${info.surtidores ?? 'N/A'}` },
                        { type: 'text', value: `Checado:   ${info.checadores ?? 'N/A'}` },
                        { type: 'text', value: `Empacado:  ${info.empacador}` },

                        { type: 'feed', value: 2 },

                        { type: 'text', value: '------------------------------------------------------------------------' },

                        { type: 'align', value: 'left' },
                        { type: 'text', value: 'CodigoQR:' },
                        { type: 'align', value: 'center' },
                        { type: 'qr', value: info.cod_bulto, size: 2, error: 'S' },

                        { type: 'feed', value: 1 },

                        { type: 'align', value: 'left' },
                        { type: 'text', value: 'Quim. Responsable:' },
                        { type: 'text', value: 'Jesus Andres Nuñez Lopez' },
                        { type: 'text', value: 'Ced. Prof.: 1433424' },
                        { type: 'text', value: `Agente:  ${info.agente ?? 'N/A'}`, bold: true },
                        { type: 'text', value: 'Aviso funcionamiento' },
                        { type: 'text', value: 'Ciudad: Mazatlan, Sinaloa' },

                        { type: 'feed', value: 2 },

                        { type: 'align', value: 'center' },
                        { type: 'text', value: 'Saher', bold: true },

                        { type: 'feed', value: 3 },
                        { type: 'cut' },
                    ]
                }
            };
        }
        if (tipo_documento === 'FACTURA') {
            const pedido = UUID_REGEX.test(id_pedido_alm)
                ? await Pedido_AlmacenRepository.getByID(id_pedido_alm)
                : await Pedido_AlmacenRepository.getByCodInterno(id_pedido_alm);
            if (!pedido) throw new Error('Pedido no encontrado');

            const factura = await Facturas.findOne({
                where: { id_pedido_alm: pedido.id_pedido_alm },
                order: [['createdAt', 'DESC']],
            });
            if (!factura) throw new Error('No se encontró factura para este pedido');


            if (!factura.pdf_url) throw new Error('La factura aún no tiene PDF generado (puede estar pendiente de timbrado)');

            data = {
                cod_interno_pedido: pedido.cod_int_pedido_alm,
                tipo_documento:     'FACTURA',
                id_impresora,
                payload: {
                    tipo:         'pdf',
                    ruta_archivo: factura.pdf_url,
                }
            };
        }

        // console.log(data);
        return await TrabajoImpresionRepository.create(data);
    },




};
