import { Request, Response } from "express";
import { NotasCreditoProveedorService } from "../../services/Devoluciones_NC/NotasCreditoProveedor.service";
import { AuthedRequest } from "../../middleware/auth";

export class NotasCreditoController {
    static createNotaCredito = async (req: Request, res: Response) => {
        try {
            const nuevaNotaCredito = await NotasCreditoProveedorService.createNotaDeCredito(req.body)
            res.status(200).json(nuevaNotaCredito);
        } catch (error) {
            //  console.log(error)
            res.status(500).json({ message: "Error al obtener las devoluciones", error });
        }
    };

    static getProductosPendientes = async (req: Request, res: Response) => {
        try {
            const { compraId } = req.params;
            //console.log("HOLA", compraId)
            const productos = await NotasCreditoProveedorService.getProductosPendientes(compraId);
            res.status(200).json(productos);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener productos pendientes", error });
        }
    };

    static getProductosPendientesByFactura = async (req: Request, res: Response) => {
        try {
            const { facturaId } = req.params;
            const productos = await NotasCreditoProveedorService.getProductosPendientesByFactura(facturaId);
            res.status(200).json(productos);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener productos pendientes de factura", error });
        }
    };

    static darEntradaInventario = async (req: AuthedRequest, res: Response) => {
        try {

            const { id_factura_proveedor, productos } = req.body;
            if (!id_factura_proveedor || !Array.isArray(productos) || productos.length === 0) {
                res.status(400).json({ message: "id_factura_proveedor y productos son requeridos" });
            }
            const resultado = await NotasCreditoProveedorService.darEntradaInventario({ id_factura_proveedor, id_empresa: req.user?.id_empresa, productos });
            res.status(200).json(resultado);
        } catch (error: any) {
            res.status(500).json({ message: error?.message ?? "Error al dar entrada al inventario", error });
        }
    };

}

