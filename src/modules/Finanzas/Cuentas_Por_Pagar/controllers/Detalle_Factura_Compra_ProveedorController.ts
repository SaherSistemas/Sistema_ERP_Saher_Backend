import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'


import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor } from "../interface/Factura_Compra_Proveedor.interfece";
import { Factura_Compra_ProveedorService } from "../services/Factura_Compra_Proveedor.service";
import { AuthedRequest } from "../../../../middleware/auth";
import { Detalle_Factura_Compra_ProveedorService } from "../services/Detalle_Factura_Compra_Proveedor.service";

export class Detalle_Factura_Compra_ProveedorController {
    static modificarLotesYDetallesRecibidosFacturaProveedor = async (req: AuthedRequest, res: Response) => {
        try {
            const usuario_empleado_chequeo = req.user?.username;
            const facturas = await Detalle_Factura_Compra_ProveedorService.modificarLotesYDetallesRecibidosFacturaProveedor(req.body, usuario_empleado_chequeo);
            res.status(200).json({ mensaje: facturas })

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }

    static guardarLineaFactura = async (req: Request, res: Response) => {
        try {
            const { id_factura } = req.params;
            const resultado = await Detalle_Factura_Compra_ProveedorService.guardarLineaFactura(id_factura, req.body);
            res.status(200).json(resultado);
        } catch (error: any) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    };
    static getLineasFactura = async (req: Request, res: Response) => {
        try {
            const { id_factura } = req.params;
            const resultado = await Detalle_Factura_Compra_ProveedorService.getLineasFactura(id_factura);
            res.status(200).json(resultado);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };
}