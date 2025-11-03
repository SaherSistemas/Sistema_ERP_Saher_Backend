import { Router } from "express";
import { Presupuesto_EmpresaController } from "../../controllers/Presupuestos/Presupuesto_EmpresaController";


const router = Router();

router.get('/', Presupuesto_EmpresaController.getAll);
router.post('/', Presupuesto_EmpresaController.create);
router.get('/buscarPorFecha/', Presupuesto_EmpresaController.buscarPorFecha);
router.get('/empresa/:id_empre', Presupuesto_EmpresaController.getByEmpresa);
router.get('/:id', Presupuesto_EmpresaController.getById);
router.put('/:id', Presupuesto_EmpresaController.update);
router.post('/cerrar/:id', Presupuesto_EmpresaController.cerrarPresupuesto);

router.get('/vigentes/:id_empre', Presupuesto_EmpresaController.getVigentes);



export default router;