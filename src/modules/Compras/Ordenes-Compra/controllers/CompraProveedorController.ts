import type { Request, Response } from "express"
import { compraProveedorService } from "../services/compraProveedor.service"
import { ICompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface"

export class CompraProveedorController {
    static createCompraProveedor = async (req: Request, res: Response) => {
        try {
            const data: IEsctructuraCompra = req.body
            // console.log("DATAAA EN CONTROLLER", data);
            const newCompra = await compraProveedorService.createCompraProveedor(data)
            res.status(201).json({ mensaje: "Compra creada correctamente.", compra: newCompra })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la compra" })
        }
    }
    static comprasProveedorPorIDCompraGeneral = async (req: Request, res: Response) => {
        try {
            const { id_compra_general } = req.params
            const comprasProveedorPorIDCG = await compraProveedorService.getCompraProveedorPorIdGeneral(id_compra_general)
            // console.log(comprasProveedorPorIDCG)
            res.status(200).json({ mensaje: "Compras proveedor por compra general.", comprasProveedor: comprasProveedorPorIDCG })
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: "Error al obtener." })
        }
    }
    static CompraDevolucionPendiente = async (req: Request, res: Response) => {
        try {
            //const devolucionesPendientes = await compraProveedorService.getDevolucionesPendientes();
            //res.status(200).json({ mensaje: "Devoluciones pendientes.", devolucionesPendientes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener devoluciones pendientes." });
        }
    }
    static generarPDFListado = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const pdfBuffer = await compraProveedorService.generarPDFListado(id_comp);

            //  const retornarNombreArchivo = await CompraService.obtenerNombreArchivoPDF(id_comp);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="prueba"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            res.status(500).json({ error: 'No se pudo generar el PDF' });
        }
    };
    static nombreArchivoPDF = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const nombreArchivo = await compraProveedorService.obtenerNombreArchivoPDF(id_comp);
            res.status(200).json({ nombreArchivo });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener el nombre del archivo PDF." });
        }
    }


    static getAllCompras_ProveedorParaRecibir = async (req: Request, res: Response) => {
        try {
            const { id_empresa_sucursal } = req.params;
            const comprasProveedorPorRecibir = await compraProveedorService.getAllCompras_ProveedorParaRecibir(id_empresa_sucursal);
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
            const compraProveedorRecibida = await compraProveedorService.marcarCompraProveedorComoRecibida(id_comp, id_empleado);
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
            const iniciarChecado = await compraProveedorService.marcarIniciarChecado(id_comp, id_empleado);
            res.status(200).json({ mensaje: "Compra proveedor marcada como en chequeo.", compraProveedor: iniciarChecado });
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: "Error al marcar la compra proveedor como en chequeo." });
        }
    }


    static iniciarAcomodo = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const { id_empleado } = req.body;
            const iniciarAcomodo = await compraProveedorService.marcarInicioAcomodo(id_comp, id_empleado)
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
            const finalizarAcomodo = await compraProveedorService.marcarFinAcomodo(id_comp, id_empleado)
            res.status(200).json({ mensaje: "Compra proveedor Fin acomodo.", compraProveedor: finalizarAcomodo });
        } catch (error) {
            // console.error(error);
            res.status(500).json({ message: error.message || "Error al finalizar acomodo de la compra proveedor." });
        }
    }
}