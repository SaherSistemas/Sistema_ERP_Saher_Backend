import { Router } from "express";
import { LotesArticuloSucursalController } from "../../controllers/LotesYCaducidades/Lote_ArticuloSucursalController"

const router = Router();

router.get('/', LotesArticuloSucursalController.getAll);
router.get('/:id', LotesArticuloSucursalController.getByID);
router.get("/empresa/:id_empre/articulo/:id_artic", LotesArticuloSucursalController.getAllByEmpresaArticulo);

router.get('/codigoBarra/:cod_barr_artic', LotesArticuloSucursalController.getLotesPorCodigoBarra);
router.post('/', LotesArticuloSucursalController.create);
// router.get('/lotes/repartir/:cod_barr_artic', LotesArticuloSucursalController.repartirCantidadEntreLotes);


export default router;
