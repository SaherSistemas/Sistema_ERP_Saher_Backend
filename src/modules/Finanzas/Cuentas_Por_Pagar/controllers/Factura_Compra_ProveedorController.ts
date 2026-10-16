import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'


import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor } from "../interface/Factura_Compra_Proveedor.interfece";
import { Factura_Compra_ProveedorService } from "../services/Factura_Compra_Proveedor.service";
import { AuthedRequest } from "../../../../middleware/auth";
import Factura_Compra_Proveedor from "../model/Factura_Compra_Proveedor";
import { AnalisisFacturaService } from "../../../Compras/Analisis_Factura/AnalisisFactura.service";
import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import { RUTA_FACTURAS_PROVEEDOR, SUBCARPETA_ARCHIVO } from "../../../../middleware/multerArchivosFacturaProveedor";

export class Factura_Compra_ProveedorController {
    static getAllConFiltroDeEstado = async (req: Request, res: Response) => {
        try {
            const id_empresa = (req.query.id_empresa as string) || undefined;
            const facturas = await Factura_Compra_ProveedorService.getAllConFiltroDeEstado(id_empresa);
            res.status(200).json({ mensaje: facturas })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }
    static finalizarChequeoFacturaProveedor = async (req: AuthedRequest, res: Response) => {

        try {
            // console.log(req.user)
            const id_referencia_persona = req.user?.id_referencia_persona || String(req.query.id_referencia_persona || "");
            const { id_factura_proveedor } = req.params;
            //console.log(id_factura_proveedor, username)
            const facturas = await Factura_Compra_ProveedorService.finalizarChequeoFacturaProveedor(id_factura_proveedor, id_referencia_persona, req.user?.id_empresa ?? null);
            // console.log(facturas)
            res.status(200).json({ mensaje: "Chequeo finalizado correctamente." })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }

    static getFacturasPorCompraProveedor = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const facturas = await Factura_Compra_ProveedorService.getFacturasPorCompraProveedor(id_comp);
            res.status(200).json(facturas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las facturas de la compra.' });
        }
    }

    static getFacturaCompleta = async (req: Request, res: Response) => {
        try {
            const { id_factura_proveedor } = req.params;
            const resultado = await Factura_Compra_ProveedorService.getFacturaCompleta(id_factura_proveedor);
            res.status(200).json(resultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener el detalle completo de la factura.' });
        }
    }

    static getDetallesFacturaPorIdFacturaProveedor = async (req: Request, res: Response) => {
        try {
            const { id_factura_proveedor } = req.params;
            const detallesFactura = await Factura_Compra_ProveedorService.getDetallesFacturaPorIdFacturaProveedor(id_factura_proveedor);
            res.status(200).json({ detallesFactura })
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener los detalles de la factura." });
        }
    }

    static guardarCapturaCompleta = async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado_registro_lotes = req.user?.id_referencia_persona
                || String(req.query.id_referencia_persona || '');

            const resultado = await Factura_Compra_ProveedorService.guardarCapturaCompleta({
                ...req.body,
                id_empleado_registro_lotes: id_empleado_registro_lotes || null,
            });
            res.status(201).json({ mensaje: "Captura completa guardada correctamente.", resultado });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al guardar los artículos de la factura." });
        }
    }
    static guardarFacturaEIniciarCapturaLotes = async (req: Request, res: Response) => {
        try {
            const data: ICreateFacturaCompraProveedor = req.body;
            const actualizarFolioEIniciarCapturaLotes = await Factura_Compra_ProveedorService.guardarFacturaEIniciarCapturaLotes(data);
            res.status(200).json({ mensaje: "Folio compra se actualizó.", compraActualizada: actualizarFolioEIniciarCapturaLotes });
        } catch (error: any) {
            console.error(error);

            // Error de negocio controlado (folio duplicado, compra no encontrada, etc.)
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
                return;
            }

            res.status(500).json({ message: "Error al actualizar la compra." });
            return;
        }
    };


    // Lee el XML (y el PDF, si viene) de una factura de proveedor y lo compara con la orden de compra:
    // artículos, cantidades, precios y lotes. NO guarda nada; es solo para pre-llenar la captura.
    static analizarDocumentos = async (req: Request, res: Response) => {
        try {
            const id_comp = String(req.body?.id_comp ?? '').trim();
            const id_proveedor = String(req.body?.id_proveedor ?? '').trim();
            const archivos = req.files as Record<string, Express.Multer.File[]> | undefined;
            const xml = archivos?.xml?.[0];
            const pdf = archivos?.pdf?.[0];
            if (!xml) {
                res.status(400).json({ message: 'Sube el XML de la factura (es obligatorio para analizarla).' });
                return;
            }
            const resultado = await AnalisisFacturaService.analizar({
                id_comp: id_comp || undefined,
                id_proveedor: id_proveedor || undefined,
                xml: xml.buffer,
                pdf: pdf?.buffer ?? null,
            });
            res.status(200).json(resultado);
        } catch (error: any) {
            console.error('[analizarDocumentos factura proveedor]', error);
            res.status(400).json({ message: error?.message ?? 'No se pudo analizar la factura.' });
        }
    };

    // Guarda el PDF y/o el XML de la factura del proveedor (campos "pdf" y "xml" del form-data).
    // Quedan en <RUTA_FACTURAS_PROVEEDOR>\pdf\<folio>.pdf y <RUTA_FACTURAS_PROVEEDOR>\xmls\<folio>.xml, con el
    // folio que se registró en la factura; la URL queda en url_PDF / url_XML. Se puede llamar varias veces:
    // solo reemplaza el archivo que venga.
    static subirArchivos = async (req: Request, res: Response) => {
        try {
            const { id_factura } = req.params;
            const archivos = req.files as Record<string, Express.Multer.File[]> | undefined;
            const pdf = archivos?.pdf?.[0];
            const xml = archivos?.xml?.[0];
            if (!pdf && !xml) {
                res.status(400).json({ message: 'No se recibió ningún PDF o XML válido.' });
                return;
            }
            const factura = await Factura_Compra_Proveedor.findByPk(id_factura);
            if (!factura) {
                res.status(404).json({ message: 'Factura no encontrada.' });
                return;
            }

            // El folio se limpia para que sea un nombre de archivo válido (sin /  : * ? " < > |)
            const folio = String((factura as any).folio_factura_proveedor ?? '').trim()
                .replace(/[\\/:*?"<>|\s]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 80) || String(id_factura);

            const guardar = async (archivo: Express.Multer.File, tipo: 'pdf' | 'xml'): Promise<string> => {
                const sub = SUBCARPETA_ARCHIVO[tipo];
                const ext = tipo === 'pdf' ? '.pdf' : '.xml';
                const campo = tipo === 'pdf' ? 'url_PDF' : 'url_XML';
                const dir = path.join(RUTA_FACTURAS_PROVEEDOR, sub);
                fs.mkdirSync(dir, { recursive: true });

                // Si otra factura (de otro proveedor, por ejemplo) ya usa ese mismo folio, no se le pisa su archivo
                let nombre = `${folio}${ext}`;
                let url = `/api/uploads/facturas-proveedor/${sub}/${encodeURIComponent(nombre)}`;
                const ocupado = await Factura_Compra_Proveedor.findOne({
                    where: { [campo]: url, id_factura_proveedor: { [Op.ne]: id_factura } } as any,
                    attributes: ['id_factura_proveedor'],
                });
                if (ocupado) {
                    nombre = `${folio}_${String(id_factura).slice(0, 8)}${ext}`;
                    url = `/api/uploads/facturas-proveedor/${sub}/${encodeURIComponent(nombre)}`;
                }
                fs.writeFileSync(path.join(dir, nombre), archivo.buffer);
                return url;
            };

            const cambios: { url_PDF?: string; url_XML?: string } = {};
            if (pdf) cambios.url_PDF = await guardar(pdf, 'pdf');
            if (xml) cambios.url_XML = await guardar(xml, 'xml');
            await factura.update(cambios);
            res.status(200).json({ mensaje: 'Archivos guardados.', ...cambios });
        } catch (error: any) {
            console.error('[subirArchivos factura proveedor]', error);
            res.status(500).json({ message: error?.message ?? 'No se pudieron guardar los archivos.' });
        }
    };

    static actualizarEncabezado = async (req: Request, res: Response) => {
        try {
            const { id_factura_proveedor } = req.params;
            const data = req.body;
            const factura = await Factura_Compra_ProveedorService.actualizarEncabezado(id_factura_proveedor, data);
            res.status(200).json({ mensaje: 'Encabezado actualizado correctamente.', factura });
        } catch (error: any) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
                return;
            }
            res.status(500).json({ message: 'Error al actualizar el encabezado de la factura.' });
        }
    };

    static getFacturaEnCaptura = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const resultado = await Factura_Compra_ProveedorService.getFacturaEnCaptura(id_comp);
            res.status(200).json(resultado);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
    /*
    static createFacturaCompraProveedor = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const id_factura_proveedor = uuidv4();
            const newFactura = await Factura_Compra_ProveedorService.createFacturaCompraProveedor({
                ...data,
                id_factura_proveedor
            });
            res.status(201).json({ mensaje: "Factura creada correctamente.", factura: newFactura });
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear la factura" });
        }
    }*/
    static getByIDComp = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const factura = await Factura_Compra_ProveedorService.getByIDComp(id_comp);
            res.status(200).json(factura)
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "No se encontro la factura" })
        }
    }
}