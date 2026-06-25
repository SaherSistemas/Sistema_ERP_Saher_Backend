import { Pedido_AlmacenRepository } from "../../Almacen/Pedido/repositories/Pedido_Almacen.repository";
import { ImpresoraRepository } from "../repositories/ImpresoraRepository";
import { TrabajoImpresionRepository } from "../repositories/TrabajoImpresionRepository";
import { ICreateTrabajoImpresion } from "../interface/TrabajoImpresion.interface";
import { Bulto_PedidoRepository } from "../../Almacen/Empaque/repositories/Bulto_Pedido.repository";
import Facturas from "../../Facturas/model/Facturas.model";
import Remision from "../../Finanzas/Remisiones/model/Remision.model";
import { RemisionService } from "../../Finanzas/Remisiones/services/Remision.service";
import { guardarRemisionPdf } from "../../Finanzas/Remisiones/helpers/remision-storage.helper";
import { generarPdfEtiquetasTarima, DatosEtiquetaTarima } from "../helpers/etiqueta-tarima.helper";
import { generarPdfBulto } from "../helpers/bulto-label.helper";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TrabajoImpresionService = {
    /**CHEQUEO */
    createTrabajoImpresion: async (id_pedido_alm: string, tipo_documento: string, estacion: string, id_empresa: string, extraBody?: Record<string, any>) => {
        let data: ICreateTrabajoImpresion;

        const estacionEfectiva =
            tipo_documento === 'BULTO'          ? 'ETIQUETAS_BULTO'   :
            tipo_documento === 'ETIQUETA_TARIMA' ? 'ETIQUETAS_TARIMA'  :
            estacion;

        const id_impresora = await ImpresoraRepository.getImpresora(id_empresa, estacionEfectiva);
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
            const rutaPdf = await generarPdfBulto(info);

            data = {
                cod_interno_pedido: info.cod_int_pedido_alm,
                tipo_documento:     'BULTO',
                id_impresora,
                max_intentos:       1,
                payload: {
                    tipo:         'pdf',
                    ruta_archivo: rutaPdf,
                },
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

        if (tipo_documento === 'REMISION') {
            // id_pedido_alm es el UUID o código del pedido (igual que en FACTURA).
            // Buscamos la remisión más reciente asociada a ese pedido.
            const pedido = UUID_REGEX.test(id_pedido_alm)
                ? await Pedido_AlmacenRepository.getByID(id_pedido_alm)
                : await Pedido_AlmacenRepository.getByCodInterno(id_pedido_alm);
            if (!pedido) throw new Error('Pedido no encontrado');

            const remision = await Remision.findOne({
                where:      { id_pedido_alm: pedido.id_pedido_alm },
                order:      [['fecha_remision', 'DESC']],
                attributes: ['id_remision', 'folio_remision'],
            });
            if (!remision) throw new Error('No existe remisión para este pedido');

            // Generar PDF y guardarlo en disco
            const pdfBuffer = await RemisionService.generarPdf(remision.id_remision);
            const rutaPdf   = guardarRemisionPdf(remision.id_remision, pdfBuffer);

            data = {
                cod_interno_pedido: `REM-${remision.folio_remision}`,
                tipo_documento:     'REMISION',
                id_impresora,
                payload: {
                    tipo:         'pdf',
                    ruta_archivo: rutaPdf,
                },
            };
        }

        if (tipo_documento === 'ETIQUETA_TARIMA') {
            const { art, lote, lineas: lineasRaw, usuario } = extraBody ?? {};

            if (!art || !lineasRaw) throw new Error('Faltan datos: art y lineas son requeridos');

            const lineas: DatosEtiquetaTarima['lineas'] = Array.isArray(lineasRaw)
                ? lineasRaw
                : Object.values(lineasRaw);

            const datos: DatosEtiquetaTarima = { art, lote: lote ?? {}, lineas, usuario };
            const rutaPdf = await generarPdfEtiquetasTarima(datos);

            data = {
                cod_interno_pedido: `ETQ-${Date.now()}`,
                tipo_documento:     'ETIQUETA_TARIMA',
                id_impresora,
                max_intentos:       1,
                payload: {
                    tipo:         'pdf',
                    ruta_archivo: rutaPdf,
                },
            };
        }

        // console.log(data);
        return await TrabajoImpresionRepository.create(data);
    },




};
