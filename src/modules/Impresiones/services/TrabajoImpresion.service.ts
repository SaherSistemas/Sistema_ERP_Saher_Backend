import { qr } from "mathjs";
import { Pedido_AlmacenRepository } from "../../Almacen/Pedido/repositories/Pedido_Almacen.repository";
import { ImpresoraRepository } from "../repositories/ImpresoraRepository";
import { TrabajoImpresionRepository } from "../repositories/TrabajoImpresionRepository";
import { ICreateTrabajoImpresion } from "../interface/TrabajoImpresion.interface";
import { Bulto_PedidoRepository } from "../../Almacen/Empaque/repositories/Bulto_Pedido.repository";

export const TrabajoImpresionService = {
    /**CHEQUEO */

    createTrabajoImpresion: async (id_pedido_alm: string, tipo_documento: string, estacion: string, id_empresa: string) => {
        let data: ICreateTrabajoImpresion;

        const id_impresora = await ImpresoraRepository.getImpresora(id_empresa, estacion);
        if (tipo_documento === 'PEDIDO_ALMACEN') {
            const pedido = await Pedido_AlmacenRepository.getByID(id_pedido_alm);
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
            //OBTENER INFORMACION DEL PEDIDO PARA LA ETIQUETA DE BULTO
            const cod_bulto = id_pedido_alm;
            const id_pedido = await Bulto_PedidoRepository.getInfoPedidoParaBulto(cod_bulto);
            data = {
                "cod_interno_pedido": id_pedido_alm,
                "tipo_documento": "BULTO",
                "id_impresora": id_impresora,
                "payload": {
                    "tipo": "escpos",
                    "comandos": [


                        { "type": "align", "value": "center" },
                        { "type": "text", "value": "Emisor  FARMACIAS SAHER DE SINALOA S DE RL DE CV" },
                        { "type": "text", "value": "------------------------------------------------------------------------" },

                        { "type": "align", "value": "left" },
                        { "type": "text", "value": "Destinatario" },
                        { "type": "text", "value": "Razon Social:   FARMACIAS SAHER DE SINALOA", "bold": true },
                        { "type": "text", "value": "Nom Comercial:  FCIA UNISIN SUC. AMERICAS", "bold": true },

                        { "type": "feed", "value": 1 },

                        { "type": "text", "value": "Fact.:     01/04/26      10:39:47" },
                        { "type": "text", "value": "Fec Ped.:  31/03/26" },
                        { "type": "text", "value": "No. Pedido:" },

                        { "type": "feed", "value": 1 },

                        { "type": "align", "value": "center" },
                        { "type": "barcode", "symbology": "CODE128", "value": "30481-1", "height": 60 },

                        { "type": "text", "value": "30481", "bold": true, "size": 2 },

                        { "type": "feed", "value": 1 },

                        { "type": "text", "value": "Bultos:  1 de  1", "bold": true },

                        { "type": "feed", "value": 1 },

                        { "type": "align", "value": "left" },
                        { "type": "text", "value": "Surtido:   Rene" },
                        { "type": "text", "value": "Checado:   Guadalupe" },
                        { "type": "text", "value": "Empacado:  Rene" },

                        { "type": "feed", "value": 2 },

                        { "type": "text", "value": "------------------------------------------------------------------------" },

                        { "type": "align", "value": "left" },
                        { "type": "text", "value": "CodigoQR:" },
                        { "type": "align", "value": "center" },
                        { "type": "qr", "value": id_pedido_alm, "size": 2, "error": "S" },

                        { "type": "feed", "value": 1 },

                        { "type": "align", "value": "left" },
                        { "type": "text", "value": "Quim. Responsable:" },
                        { "type": "text", "value": "Jesus Andres Nuñez Lopez" },
                        { "type": "text", "value": "Ced. Prof.: 1433424" },
                        { "type": "text", "value": "Agente:  Farmacia UniSin", "bold": true },
                        { "type": "text", "value": "Aviso funcionamiento" },
                        { "type": "text", "value": "Ciudad: Mazatlan, Sinaloa" },

                        { "type": "feed", "value": 2 },

                        { "type": "align", "value": "center" },
                        { "type": "text", "value": "Saher", "bold": true },

                        { "type": "feed", "value": 3 },
                        { "type": "cut" }

                    ]
                }
            }


        }
        // console.log(data);
        return await TrabajoImpresionRepository.create(data);
    },




};
