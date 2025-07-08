import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'

import { ProveedorService } from "../../services/Proveedor/Proveedor.service";
import { ICreateProveedor, IProveedorUpdateBody } from "../../interface/Proveedor/Proveedor.interface";
import { Factura_Compra_ProveedorService } from "../../services/Proveedor/Factura_Compra_Proveedor.service";
import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor } from "../../interface/Proveedor/Factura_Compra_Proveedor.interfece";

export class Factura_Compra_ProveedorController {
    static getAllFacturas = async (req: Request, res: Response) => {
        try {
            const facturas = await Factura_Compra_ProveedorService.getAllFacturas();
            res.status(200).json({ mensaje: facturas })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
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