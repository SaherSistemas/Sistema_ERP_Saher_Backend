import { Router } from 'express';
import { RemisionController } from '../controllers/RemisionController';
import { authMiddleware } from '../../../../middleware/auth';

const router = Router();

// Obtener todas las remisiones
router.get('/', RemisionController.getAll);

// Obtener remisiones de un cliente específico
router.get('/cliente/:id_cliente', RemisionController.getByCliente);

// Vista previa (borrador) de la remisión de un pedido ya checado, sin crear nada
router.get('/pedido/:id_pedido_alm/vista-previa', authMiddleware, RemisionController.vistaPreviaDesdePedido);

// PDF de una remisión — debe ir ANTES del wildcard /:id_remision
// (con ?id_lista_precio=… solo para administradores; por eso lleva authMiddleware, que llena req.user)
router.get('/:id_remision/pdf', authMiddleware, RemisionController.getPDF);

// Obtener detalle completo de una remisión
router.get('/:id_remision', RemisionController.getByIdConDetalles);

// Crear remisión directamente desde pedido (sin CFDI) y retornar PDF
router.post('/desde-pedido/:id_pedido_alm', RemisionController.crearDesdePedido);

// Crear una remisión (genera detalles + CxC automáticamente)
router.post('/', RemisionController.create);

export default router;
