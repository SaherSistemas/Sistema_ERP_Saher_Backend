import type { Request, Response } from "express";

import { CompraService } from "../../services/Compras/Compras.service";
import { IEsctructuraCompra } from "../../interface/Compras/Compra_Proveedor.interface";

export class ComprasController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const todosLasCompras = await CompraService.getAll(id_empresa);
            res.status(200).json({ mensaje: todosLasCompras })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todas las compras." })
        }
    }

    static getByEmpresaEnCaptura = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params
            const compraEnCaptura = await CompraService.getEnCaptura(id_empresa)
            res.status(200).json(compraEnCaptura)
        } catch (error) {

        }
    }
    static createCompra = async (req: Request, res: Response) => {
        try {
            const data: IEsctructuraCompra = req.body
            const newCompra = await CompraService.createCompra(data)
            res.status(201).json({ mensaje: "Compra creada correctamente.", compra: newCompra })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la compra" })
        }
    }

    static finalizarCompras = async (req: Request, res: Response) => {
        try {
            const { id_empresa_sucursal } = req.params;
            const modificarCompras = await CompraService.finalizarCompras(id_empresa_sucursal)
            res.status(200).json({ mensaje: "Compra finalizada" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al finalizar la compra" })
        }
    }

    static comprasProveedorPorIDCompraGeneral = async (req: Request, res: Response) => {
        try {
            const { id_compra_general } = req.params
            const comprasProveedorPorIDCG = await CompraService.getCompraProveedorPorIdGeneral(id_compra_general)
            res.status(200).json({ mensaje: "Compras proveedor por compra general.", comprasProveedor: comprasProveedorPorIDCG })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener." })
        }
    }
    /*
        static articulosGenerarPDF = async (req: Request, res: Response) => {
            try {
                const { id_comp } = req.params
                const articulosParaGenerarPDF = await CompraService.articulosGenerarPDF(id_comp);
                res.status(200).json(articulosParaGenerarPDF)
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Error al obtener." })
    
            }
        }*/

    static generarPDFListado = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const pdfBuffer = await CompraService.generarPDFListado(id_comp);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Orden_Compra_${id_comp}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            res.status(500).json({ error: 'No se pudo generar el PDF' });
        }
    };

}