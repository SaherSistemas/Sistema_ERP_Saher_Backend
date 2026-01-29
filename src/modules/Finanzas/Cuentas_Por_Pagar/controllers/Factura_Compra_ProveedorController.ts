import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'


import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor } from "../interface/Factura_Compra_Proveedor.interfece";
import { Factura_Compra_ProveedorService } from "../services/Factura_Compra_Proveedor.service";
import { AuthedRequest } from "../../../../middleware/auth";

export class Factura_Compra_ProveedorController {
    static getAllConFiltroDeEstado = async (req: Request, res: Response) => {
        // console.log("HOLA")

        try {
            const facturas = await Factura_Compra_ProveedorService.getAllConFiltroDeEstado();
            // console.log(facturas)
            res.status(200).json({ mensaje: facturas })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }
    static finalizarChequeoFacturaProveedor = async (req: AuthedRequest, res: Response) => {

        try {
            // console.log(req.user)
            const username = req.user?.username || String(req.query.username || "");
            const { id_factura_proveedor } = req.params;
            const facturas = await Factura_Compra_ProveedorService.finalizarChequeoFacturaProveedor(id_factura_proveedor, username);
            // console.log(facturas)
            res.status(200).json({ mensaje: facturas })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
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

    static guardarCapturaCompleta = async (req: Request, res: Response) => {
        try {
            // Lógica para guardar los artículos de la factura
            const data = req.body;
            const resultado = await Factura_Compra_ProveedorService.guardarCapturaCompleta(data)
            res.status(201).json({ mensaje: "Captura completa guardada correctamente.", resultado })

        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al guardar los artículos de la factura." })
        }
    }
    static guardarFacturaEIniciarCapturaLotes = async (req: Request, res: Response) => {
        try {
            const data: ICreateFacturaCompraProveedor = req.body;
            const actualizarFolioEIniciarCapturaLotes = await Factura_Compra_ProveedorService.guardarFacturaEIniciarCapturaLotes(data)
            res.status(200).json({ mensaje: "Folio compra se actualizo.", compraActualizada: actualizarFolioEIniciarCapturaLotes })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al actualizar la compra." })
        }
    }/*
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