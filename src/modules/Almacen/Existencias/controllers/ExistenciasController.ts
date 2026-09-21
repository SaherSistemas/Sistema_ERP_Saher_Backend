import { Response } from 'express'
import { AuthedRequest } from '../../../../middleware/auth'
import { ExistenciasService } from '../services/Existencias.service'

const ctx = (req: AuthedRequest) => ({
    id_empresa: String(req.user?.id_empresa || '').trim(),
    id_empleado: String(req.user?.id_referencia_persona || '').trim(),
})

export const ExistenciasController = {

    getPorArticulo: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req)
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return }
            const data = await ExistenciasService.getPorArticulo(id_empresa, req.params.id_articulo)
            res.status(200).json(data)
        } catch (e: any) {
            console.error('[Existencias.getPorArticulo]', e)
            res.status(500).json({ message: e.message ?? 'Error al consultar las existencias.' })
        }
    },

    agregar: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req)
            if (!id_empresa || !id_empleado) { res.status(400).json({ message: 'No se pudo identificar al usuario.' }); return }
            const b = req.body ?? {}
            if (!b.id_articulo) { res.status(400).json({ message: 'id_articulo requerido' }); return }
            const r = await ExistenciasService.agregar({
                id_empresa, id_empleado,
                id_articulo: b.id_articulo,
                cantidad: Number(b.cantidad),
                id_ubicacion_sucursal: b.id_ubicacion_sucursal || null,
                id_lote: b.id_lote || null,
                numero_lote: b.numero_lote || undefined,
                fecha_vencimiento: b.fecha_vencimiento || undefined,
                costo_unitario: b.costo_unitario != null && b.costo_unitario !== '' ? Number(b.costo_unitario) : null,
                notas: b.notas ?? null,
            })
            res.status(201).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.agregar]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo dar la entrada.' })
        }
    },

    ajustarCantidad: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req)
            if (!id_empresa || !id_empleado) { res.status(400).json({ message: 'No se pudo identificar al usuario.' }); return }
            const r = await ExistenciasService.ajustarCantidad({
                id_empresa, id_empleado,
                id_stock_ubicacion_lote: req.params.id_stock_ubicacion_lote,
                nueva_cantidad: Number(req.body?.nueva_cantidad),
                notas: req.body?.notas ?? null,
            })
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.ajustarCantidad]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo ajustar la existencia.' })
        }
    },

    getApartadasSinPedido: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req)
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return }
            res.status(200).json(await ExistenciasService.getApartadasSinPedido(id_empresa))
        } catch (e: any) {
            console.error('[Existencias.getApartadasSinPedido]', e)
            res.status(500).json({ message: e.message ?? 'Error al consultar las apartadas.' })
        }
    },

    liberarApartadasSinPedido: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req)
            if (!id_empresa || !id_empleado) { res.status(400).json({ message: 'No se pudo identificar al usuario.' }); return }
            const r = await ExistenciasService.liberarApartadasSinPedido({
                id_empresa, id_empleado, id_lotes: Array.isArray(req.body?.id_lotes) ? req.body.id_lotes : [],
            })
            console.warn(`[liberarApartadas] ${r.piezas_liberadas} pz en ${r.lotes_liberados} lote(s) por ${req.user?.username}`)
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.liberarApartadasSinPedido]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo liberar la apartada.' })
        }
    },

    eliminar: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req)
            if (!id_empresa || !id_empleado) { res.status(400).json({ message: 'No se pudo identificar al usuario.' }); return }
            const r = await ExistenciasService.eliminar({
                id_empresa, id_empleado,
                id_stock_ubicacion_lote: req.params.id_stock_ubicacion_lote,
                notas: req.body?.notas ?? null,
            })
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.eliminar]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo eliminar el registro.' })
        }
    },

    editarLote: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req)
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return }
            const b = req.body ?? {}
            const r = await ExistenciasService.editarLote({
                id_empresa, id_lote: req.params.id_lote, numero_lote: b.numero_lote, fecha_vencimiento: b.fecha_vencimiento,
            })
            console.warn(`[Existencias.editarLote] lote ${r.anterior} → ${r.nuevo} por ${req.user?.username}`)
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.editarLote]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo editar el lote.' })
        }
    },

    cambiarLote: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req)
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return }
            const b = req.body ?? {}
            const r = await ExistenciasService.cambiarLote({
                id_empresa,
                id_stock_ubicacion_lote: req.params.id_stock_ubicacion_lote,
                id_lote_destino: b.id_lote_destino || null,
                numero_lote: b.numero_lote,
                fecha_vencimiento: b.fecha_vencimiento,
            })
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.cambiarLote]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo cambiar el lote.' })
        }
    },

    mover: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req)
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return }
            const b = req.body ?? {}
            if (!b.id_stock_ubicacion_lote) { res.status(400).json({ message: 'id_stock_ubicacion_lote requerido' }); return }
            const r = await ExistenciasService.mover({
                id_empresa,
                id_stock_ubicacion_lote: b.id_stock_ubicacion_lote,
                id_ubicacion_destino: b.id_ubicacion_destino || null,
                cantidad: Number(b.cantidad),
            })
            res.status(200).json({ ok: true, data: r })
        } catch (e: any) {
            console.error('[Existencias.mover]', e)
            res.status(400).json({ message: e.message ?? 'No se pudo mover la existencia.' })
        }
    },
}
