import type { Request, Response } from "express";

import { CompraService } from "../../services/Compras/Compras.service";
import { IEsctructuraCompra } from "../../interface/Compras/Compra_Proveedor.interface";

export class ComprasController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const { total, compras } = await CompraService.getAll(id_empresa, page, limit);
            res.status(200).json({
                mensaje: compras,
                total,
                paginaActual: page,
                totalPaginas: Math.ceil(total / limit)
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todas las compras." });
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
            const { id_empleado_finaliza } = req.body;
            const modificarCompras = await CompraService.finalizarCompras(id_empresa_sucursal, id_empleado_finaliza)
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
            // console.error(error);
            res.status(500).json({ message: "Error al obtener." })
        }
    }

    static getAllCompras_ProveedorParaRecibir = async (req: Request, res: Response) => {
        try {
            const { id_empresa_sucursal } = req.params;
            const comprasProveedorPorRecibir = await CompraService.getAllCompras_ProveedorParaRecibir(id_empresa_sucursal);
            res.status(200).json({ mensaje: "Compras Proveedor para recibir.", compraProveedor: comprasProveedorPorRecibir })
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: "Error al obtener." })
        }
    }


    static marcarCompraProveedorComoRecibida = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const { id_empleado } = req.body
            const compraProveedorRecibida = await CompraService.marcarCompraProveedorComoRecibida(id_comp, id_empleado);
            res.status(200).json({ mensaje: "Compra proveedor marcada como recibida.", compraProveedor: compraProveedorRecibida });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al marcar la compra proveedor como recibida." });
        }
    }
    static iniciarChecado = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const { id_empleado } = req.body
            const iniciarChecado = await CompraService.marcarIniciarChecado(id_comp, id_empleado);
            res.status(200).json({ mensaje: "Compra proveedor marcada como recibida.", compraProveedor: iniciarChecado });
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: "Error al marcar la compra proveedor como recibida." });
        }
    }
    static iniciarAcomodo = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const { id_empleado } = req.body;
            const iniciarAcomodo = await CompraService.marcarInicioAcomodo(id_comp, id_empleado)
            res.status(200).json({ mensaje: "Compra proveedor iniciando a acomodar.", compraProveedor: iniciarAcomodo });

        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: "Error al iniciar acomodo de la compra proveedor." });
        }
    }
    static finalizarAcomodo = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const { id_empleado } = req.body;
            const finalizarAcomodo = await CompraService.marcarFinAcomodo(id_comp, id_empleado)
            res.status(200).json({ mensaje: "Compra proveedor iniciando a acomodar.", compraProveedor: finalizarAcomodo });
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: error.message || "Error al finalizar acomodo de la compra proveedor." });
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

    static nombreArchivoPDF = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const nombreArchivo = await CompraService.obtenerNombreArchivoPDF(id_comp);
            res.status(200).json({ nombreArchivo });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener el nombre del archivo PDF." });
        }
    }
    static generarPDFListado = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const pdfBuffer = await CompraService.generarPDFListado(id_comp);

            const retornarNombreArchivo = await CompraService.obtenerNombreArchivoPDF(id_comp);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${retornarNombreArchivo}"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            res.status(500).json({ error: 'No se pudo generar el PDF' });
        }
    };

}