import { Router } from 'express'
import { ExistenciasController } from '../controllers/ExistenciasController'

const router = Router()

// POST  /api/almacen/existencias_ubicacion/agregar
//   body: { id_articulo, cantidad, notas, id_ubicacion_sucursal?, id_lote? | numero_lote + fecha_vencimiento, costo_unitario? }
router.post('/agregar', ExistenciasController.agregar)

// POST  /api/almacen/existencias_ubicacion/mover
//   body: { id_stock_ubicacion_lote, id_ubicacion_destino (null = sin ubicación), cantidad }
router.post('/mover', ExistenciasController.mover)

// PATCH /api/almacen/existencias_ubicacion/:id_stock_ubicacion_lote/cantidad
//   body: { nueva_cantidad, notas }
router.patch('/:id_stock_ubicacion_lote/cantidad', ExistenciasController.ajustarCantidad)

// POST  /api/almacen/existencias_ubicacion/:id_stock_ubicacion_lote/eliminar
//   body: { notas }  → elimina la fila; lo que tuviera se da de baja como merma en el kardex
router.post('/:id_stock_ubicacion_lote/eliminar', ExistenciasController.eliminar)

// PATCH /api/almacen/existencias_ubicacion/lote/:id_lote   body: { numero_lote, fecha_vencimiento }
//   corrige el número/caducidad del lote (lote_articulo_sucursal); aplica a todas sus ubicaciones
router.patch('/lote/:id_lote', ExistenciasController.editarLote)

// POST  /api/almacen/existencias_ubicacion/:id_stock_ubicacion_lote/cambiar-lote
//   body: { id_lote_destino } | { numero_lote, fecha_vencimiento } → toda la existencia de la fila pasa a ese lote
router.post('/:id_stock_ubicacion_lote/cambiar-lote', ExistenciasController.cambiarLote)

// GET   /api/almacen/existencias_ubicacion/apartadas-sin-pedido  (antes de '/:id_articulo')
router.get('/apartadas-sin-pedido', ExistenciasController.getApartadasSinPedido)

// POST  /api/almacen/existencias_ubicacion/liberar-apartadas   body: { id_lotes: string[] }
//   libera lo apartado que ningún pedido activo respalda (se recalcula en el servidor)
router.post('/liberar-apartadas', ExistenciasController.liberarApartadasSinPedido)

// GET   /api/almacen/existencias_ubicacion/:id_articulo
//   → filas de stock_ubicacion_lote (ubicación + lote + existencia/apartada/disponible) y totales
router.get('/:id_articulo', ExistenciasController.getPorArticulo)

export default router
