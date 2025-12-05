import { Router } from 'express';
import { LotesArticuloSucursalController } from '../../controllers/LotesYCaducidades/Lote_ArticuloSucursalController';

const router = Router();

router.get('/', LotesArticuloSucursalController.getAll);
router.get('/resumen', LotesArticuloSucursalController.getResumenLotes);
router.get('/:id', LotesArticuloSucursalController.getByID);
router.get('/empresa/:id_empre/articulo/:id_artic', LotesArticuloSucursalController.getAllByEmpresaArticulo);
router.get('/:id_empre/:id_artic/validar', LotesArticuloSucursalController.validarExistencia);

router.get('/codigoBarra/:cod_barr_artic', LotesArticuloSucursalController.getLotesPorCodigoBarra);
router.post('/', LotesArticuloSucursalController.create);

export default router;
