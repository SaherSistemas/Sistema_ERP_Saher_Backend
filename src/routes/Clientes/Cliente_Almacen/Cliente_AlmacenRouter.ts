import { Router } from 'express';
import { Cliente_AlmacenController } from '../../../controllers/Clientes/Cliente_Almacen/Cliente_AlmacenController';

const router = Router();

// GET paginado
router.get('/', Cliente_AlmacenController.getAllPaginado);

// GET por ID flexible (UUID o ID interno)
router.get('/:id_cliente_alm', Cliente_AlmacenController.getByIDFlexible);

// GET por término de búsqueda
router.get('/buscar/:term_search', Cliente_AlmacenController.getClienteByTermSearch);

// GET por agente
router.get('/agente/:id_empleado', Cliente_AlmacenController.getAllByUsuarioAgente);

// POST crear
router.post('/', Cliente_AlmacenController.create);

// PUT actualizar
router.put('/:id_cliente_alm', Cliente_AlmacenController.update);

router.get('/ultimoID', Cliente_AlmacenController.ultimoID);
// DELETE baja lógica o física
//router.delete('/:id_cliente_alm', Cliente_AlmacenController.delete);

export default router;
