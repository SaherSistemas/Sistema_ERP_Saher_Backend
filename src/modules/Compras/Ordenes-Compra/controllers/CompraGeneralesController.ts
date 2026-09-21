import type { Request, Response } from "express";

import { CompraGeneralesService } from "../services/Compras.service";
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";
import type { AuthedRequest } from "../../../../middleware/auth";

export class ComprasGeneralesController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const { total, compras } = await CompraGeneralesService.getAll(id_empresa, page, limit);
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




    static getByEmpresaEnCaptura = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = req.params
            const compraEnCaptura = await CompraGeneralesService.getEnCaptura(id_empresa)
            if (!compraEnCaptura) {
                res.status(200).json(compraEnCaptura)
                return
            }
            // Cada capturista regresa a SU último artículo guardado. Si la compra es anterior a este
            // cambio (nadie con empleado registrado) se usa el último de la compra, como antes.
            const { hayCapturasConEmpleado, ultimo } = await Detalle_Compra_SolicitadoRepository
                .getUltimoArticuloDeEmpleado(id_empresa, req.user?.id_referencia_persona)
            const plano = compraEnCaptura.toJSON()
            res.status(200).json({
                ...plano,
                ultimo_articulo_guardado_usuario: hayCapturasConEmpleado ? ultimo : (plano.ultimo_articulo_guardado ?? null),
            })
        } catch (error) {
            console.error('[getByEmpresaEnCaptura]', error)
            res.status(500).json({ message: 'No se pudo consultar la compra en captura.' })
        }
    }


    static reabrirCompra = async (req: Request, res: Response) => {
        try {
            const { id_compra_general } = req.params;
            await CompraGeneralesService.reabrirCompra(id_compra_general);
            res.status(200).json({ mensaje: "Compra reabierta para seguir capturando" });
        } catch (error: any) {
            if (!error?.status) console.error(error);
            res.status(error?.status ?? 500).json({ message: error?.message ?? "Error al reabrir la compra" });
        }
    }

    static finalizarCapturaCompraGenYCompraProv = async (req: Request, res: Response) => {
        try {
            const { id_empresa_sucursal } = req.params;
            const { id_empleado_finaliza } = req.body;
            const modificarCompras = await CompraGeneralesService.finalizarCapturaCompraGenYCompraProv(id_empresa_sucursal, id_empleado_finaliza)
            res.status(200).json({ mensaje: "Compra finalizada" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al finalizar la compra" })
        }
    }


}