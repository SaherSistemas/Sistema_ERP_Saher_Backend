import { Router } from 'express';
import { CuadreExistenciasController } from '../controllers/CuadreExistenciasController';

const router = Router();

router.get('/', CuadreExistenciasController.getResumen);
router.get('/excel', CuadreExistenciasController.getExcel);
router.get('/lote/:id_lote', CuadreExistenciasController.getLote);
router.post('/cortes', CuadreExistenciasController.crearCorte);
router.get('/cortes', CuadreExistenciasController.listarCortes);
router.get('/cortes/:id_corte', CuadreExistenciasController.compararCorte);
router.get('/cortes/:id_corte/excel', CuadreExistenciasController.excelCorte);
router.delete('/cortes/:id_corte', CuadreExistenciasController.eliminarCorte);
router.post('/alertas/:id_alerta/atender', CuadreExistenciasController.atenderAlerta);

export default router;
