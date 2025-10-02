import { Router } from "express";
import { RecetaArticuloController } from "../../controllers/RecetaMedica/RecetaArticuloController";

const router = Router();

router.get('/', RecetaArticuloController.getAll);
router.post("/:id_receta/articulos", RecetaArticuloController.agregarArticulosAReceta);


export default router;
