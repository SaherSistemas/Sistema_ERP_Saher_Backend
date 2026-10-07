import { Router } from 'express';
import { InventarioController } from '../controllers/InventarioController';

const router = Router();

// Lista e inventario individual
router.get('/',          InventarioController.getLista);
router.get('/:id',       InventarioController.getById);

// Crear (genera renglones automáticamente)
router.post('/',        InventarioController.crear);
router.post('/random',  InventarioController.crearRandom);

// Conteo de un renglón
router.patch('/detalle/:id_detalle/conteo', InventarioController.actualizarConteo);

// Ajustar o no un renglón al aplicar, y dejar sin ajustar los faltantes que son piezas apartadas
router.patch('/detalle/:id_detalle/ajustar', InventarioController.ajustarRenglon);
router.patch('/:id/ignorar-apartadas',       InventarioController.ignorarFaltantesApartados);

// Agregar renglón manual (artículo/lote no generado automáticamente)
router.post('/:id/manual', InventarioController.agregarManual);

// Cambios de status
router.patch('/:id/iniciar',          InventarioController.iniciar);
router.patch('/:id/terminar',         InventarioController.terminar);
router.patch('/:id/terminar-forzado', InventarioController.terminarForzado);
router.patch('/:id/aplicar',          InventarioController.aplicar);
router.patch('/:id/cancelar',         InventarioController.cancelar);

export default router;
