import { Response } from 'express'
import { AuthedRequest } from '../../../../middleware/auth'
import { Movimiento_ArticuloService } from '../services/Movimiento_Articulo.service'

export const Movimiento_ArticuloController = {

    registrar: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.body.id_empresa || '').trim()
            const id_empleado = String(req.user?.id_referencia_persona || req.body.id_empleado || '').trim()

            if (!id_empresa) { res.status(400).json({ ok: false, message: 'id_empresa requerido' }); return }
            if (!id_empleado) { res.status(400).json({ ok: false, message: 'id_empleado requerido' }); return }

            const { id_articulo, tipo_movimiento, cantidad, fecha, documento_ref, notas } = req.body

            if (!id_articulo) { res.status(400).json({ ok: false, message: 'id_articulo requerido' }); return }
            if (!tipo_movimiento) { res.status(400).json({ ok: false, message: 'tipo_movimiento requerido' }); return }
            if (!cantidad || Number(cantidad) <= 0) { res.status(400).json({ ok: false, message: 'cantidad debe ser mayor a 0' }); return }

            const resultado = await Movimiento_ArticuloService.registrar({
                id_empresa,
                id_articulo,
                tipo_movimiento,
                cantidad: Number(cantidad),
                fecha: fecha ? new Date(fecha) : new Date(),
                documento_ref: documento_ref || null,
                notas: notas || null,
                id_empleado,
            })

            res.status(201).json({ ok: true, data: resultado })
        } catch (e: any) {
            console.error('[Movimiento_ArticuloController.registrar]', e)
            res.status(400).json({ ok: false, message: e.message ?? 'Error al registrar movimiento' })
        }
    },

    obtenerMovimientos: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.query.id_empresa || '').trim()
            const id_articulo = String(req.query.id_articulo || '').trim() || undefined
            const tipo_movimiento = String(req.query.tipo_movimiento || '').trim() || undefined
            const fecha_inicio = String(req.query.fecha_inicio || '').trim() || undefined
            const fecha_fin = String(req.query.fecha_fin || '').trim() || undefined
            const page = Math.max(1, Number(req.query.page) || 1)
            const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))

            const resultado = await Movimiento_ArticuloService.obtenerMovimientos({
                id_empresa: id_empresa || undefined,
                id_articulo,
                tipo_movimiento: tipo_movimiento as any,
                fecha_inicio,
                fecha_fin,
                page,
                limit,
            })

            res.status(200).json(resultado)
        } catch (e: any) {
            console.error('[Movimiento_ArticuloController.obtenerMovimientos]', e)
            res.status(400).json({ ok: false, message: e.message ?? 'Error al obtener movimientos' })
        }
    },

    obtenerExistencias: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empresa = String(req.user?.id_empresa || req.query.id_empresa || '').trim()
            const id_articulo = String(req.query.id_articulo || '').trim() || undefined

            if (!id_empresa) { res.status(400).json({ ok: false, message: 'id_empresa requerido' }); return }

            const resultado = await Movimiento_ArticuloService.obtenerExistencias(id_empresa, id_articulo)

            res.status(200).json({ ok: true, data: resultado })
        } catch (e: any) {
            console.error('[Movimiento_ArticuloController.obtenerExistencias]', e)
            res.status(400).json({ ok: false, message: e.message ?? 'Error al obtener existencias' })
        }
    },
}
