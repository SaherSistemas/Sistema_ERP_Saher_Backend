import { Router } from 'express';
import { LotesArticuloSucursalController } from '../../controllers/LotesYCaducidades/Lote_ArticuloSucursalController';

const router = Router();

router.get('/', LotesArticuloSucursalController.getAll);
router.get('/resumen', LotesArticuloSucursalController.getResumenLotes);
router.get('/resumen_a_promocionar', LotesArticuloSucursalController.getResumenPromocion);
router.get('/existencia/:id_artic/:id_sucursal', LotesArticuloSucursalController.getExistencia);

router.get('/:id', LotesArticuloSucursalController.getByID);
router.get('/empresa/:id_empre/articulo/:id_artic', LotesArticuloSucursalController.getAllByEmpresaArticulo);

router.get('/codigoBarra/:cod_barr_artic', LotesArticuloSucursalController.getLotesPorCodigoBarra);
router.post('/', LotesArticuloSucursalController.create);

//* AGENTE CONSUME ESTE PARA VER LAS EXISTENCIAS POR SUCURSAL  */
// router.get('/lotes/repartir/:cod_barr_artic', LotesArticuloSucursalController.repartirCantidadEntreLotes);

export default router;
