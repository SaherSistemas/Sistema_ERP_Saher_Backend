import { Router } from 'express';
import { RemisionController } from '../controllers/RemisionController';

const router = Router();

// Obtener todas las remisiones
router.get('/', RemisionController.getAll);

// Obtener remisiones de un cliente específico
router.get('/cliente/:id_cliente', RemisionController.getByCliente);

// PDF de una remisión — debe ir ANTES del wildcard /:id_remision
router.get('/:id_remision/pdf', RemisionController.getPDF);

// Obtener detalle completo de una remisión
router.get('/:id_remision', RemisionController.getByIdConDetalles);

// Crear una remisión (genera detalles + CxC automáticamente)
router.post('/', RemisionController.create);

export default router;
