import type { Request, Response } from "express"
import type { AuthedRequest } from "../../../../middleware/auth"
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository"
import { compraProveedorService } from "../services/compraProveedor.service"
import { ICompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface"

export class CompraProveedorController {

    static finalizarCapturaFacturasDeCompras = async (req: Request, res: Response) => {
        try {

            const { id_comp, productosPendientes = [] } = req.body;

            if (!id_comp) {
                res.status(400).json({ message: 'id_comp requerido' });
                return;
            }

            await compraProveedorService.finalizarCapturaYRegistrarNegados({
                id_compra_proveedor: id_comp,
                productosPendientes,
            });

            const mensaje = productosPendientes.length > 0
                ? `Captura finalizada. ${productosPendientes.length} artículo(s) registrado(s) como negados.`
                : 'Captura finalizada. Todos los artículos fueron recibidos.';

            res.status(200).json({ ok: true, mensaje });
        } catch (error) {
            console.error('[finalizarCapturaFacturasDeCompras]', error);
            res.status(500).json({ message: 'Error al finalizar la captura de la compra.' });
        }
    }
    static createCompraProveedor = async (req: AuthedRequest, res: Response) => {
        try {
            // El empleado sale del token, nunca del body
            const data: IEsctructuraCompra = { ...req.body, id_empleado: req.user?.id_referencia_persona ?? null }
            const newCompra = await compraProveedorService.createCompraProveedor(data)
            res.status(201).json({ mensaje: "Compra creada correctamente.", compra: newCompra })
        } catch (error: any) {
            // Otra persona cambió este artículo mientras esta pantalla lo tenía abierto
            if (error?.code === 'CONFLICTO_CAPTURA') {
                res.status(409).json({ code: error.code, message: error.message, actual: error.actual, capturista: error.capturista })
                return
            }
            console.error(error);
            res.status(500).json({ message: "Error al crear la compra" })
        }
    }

    // Líneas de la compra en captura agrupadas por artículo (la pantalla las consulta cada pocos segundos)
    static lineasEnCaptura = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params
            const r = await Detalle_Compra_SolicitadoRepository.getLineasEnCaptura(id_empresa)
            res.status(200).json({ totales: r.cantidadesPorArticulo, proveedores: r.proveedoresPorArticulo })
        } catch (error) {
            console.error('[lineasEnCaptura]', error)
            res.status(500).json({ message: 'No se pudieron consultar las capturas.' })
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
    static detalleOrden = async (req: Request, res: Response) => {
        try {
            const { id_comp } = req.params;
            const orden = await compraProveedorService.obtenerDetalleOrden(id_comp);
            res.status(200).json(orden);
        } catch (error) {
            console.error('Error al obtener el detalle de la orden:', error);
            res.status(500).json({ message: 'No se pudo obtener el detalle de la orden.' });
        }
    };
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