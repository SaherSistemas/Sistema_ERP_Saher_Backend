import { Router } from 'express';
import { Categoria_EmpresaController } from '../controller/Categoria_EmpresaController';

const router = Router();

// CRUD categorías empresa
router.get('/empresa/:id_empre', Categoria_EmpresaController.getAll);
router.get('/:id', Categoria_EmpresaController.getById);
router.post('/', Categoria_EmpresaController.create);
router.put('/:id', Categoria_EmpresaController.update);
router.delete('/:id', Categoria_EmpresaController.delete);

// Asignación de artículos
router.get('/:id/articulos', Categoria_EmpresaController.getArticulos);
router.post('/:id/articulos', Categoria_EmpresaController.asignarArticulo);
router.delete('/:id/articulos/:id_artic', Categoria_EmpresaController.desasignarArticulo);
router.put('/:id/articulos/sincronizar', Categoria_EmpresaController.sincronizarArticulos);

export default router;
