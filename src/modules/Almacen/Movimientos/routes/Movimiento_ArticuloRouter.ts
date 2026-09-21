import { Router } from 'express'
import { Movimiento_ArticuloController } from '../controllers/Movimiento_ArticuloController'

const router = Router()

// GET  /api/almacen/movimientos_articulo/existencias
// query: id_empresa, id_articulo?
router.get('/existencias', Movimiento_ArticuloController.obtenerExistencias)

// GET  /api/almacen/movimientos_articulo/lotes/:id_articulo
// Lotes del artículo con su disponible REAL (stock_ubicacion_lote.cantidad - cantidad_apartada)
router.get('/lotes/:id_articulo', Movimiento_ArticuloController.getLotesConDisponible)

// GET  /api/almacen/movimientos_articulo
// query: id_articulo, tipo_movimiento, fecha_inicio, fecha_fin, page, limit
router.get('/', Movimiento_ArticuloController.obtenerMovimientos)

// POST /api/almacen/movimientos_articulo
// body: { id_articulo, tipo_movimiento, cantidad, fecha?, documento_ref?, notas? }
router.post('/', Movimiento_ArticuloController.registrar)

export default router
