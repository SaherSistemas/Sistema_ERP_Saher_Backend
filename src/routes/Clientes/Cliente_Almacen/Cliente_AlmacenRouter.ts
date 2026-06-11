import { Router } from 'express';
import { Cliente_AlmacenController } from '../../../controllers/Clientes/Cliente_Almacen/Cliente_AlmacenController';

const router = Router();

// GET paginado
router.get('/', Cliente_AlmacenController.getAllPaginado);

// GET por término de búsqueda (debe ir ANTES de /:id_cliente_alm para que Express no lo capture como param)
router.get('/buscar/:term_search', Cliente_AlmacenController.getClienteByTermSearch);

// GET por agente
router.get('/agente/:id_empleado', Cliente_AlmacenController.getAllByUsuarioAgente);

// GET por ID flexible (UUID o ID interno) — va al final para no capturar las rutas estáticas
router.get('/:id_cliente_alm', Cliente_AlmacenController.getByIDFlexible);

// POST crear
router.post('/', Cliente_AlmacenController.create);

// PUT actualizar
router.put('/:id_cliente_alm', Cliente_AlmacenController.update);

// PATCH marcar/desmarcar como empresa propia
router.patch('/:id_cliente_alm/empresa-propia', Cliente_AlmacenController.toggleEmpresaPropia);

// PATCH activar / desactivar
router.patch('/estatus/:id_cliente_alm', Cliente_AlmacenController.toggleEstatus);

router.get('/ultimoID', Cliente_AlmacenController.ultimoID);
// DELETE baja lógica o física
//router.delete('/:id_cliente_alm', Cliente_AlmacenController.delete);

export default router;
