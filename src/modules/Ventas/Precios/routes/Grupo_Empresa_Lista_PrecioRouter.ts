import { Router } from "express";
import { Grupo_Empresa_Lista_PrecioController } from "../controllers/Grupo_Empresa_Lista_PrecioController";

const router = Router();

// 🔹 Obtener todos
router.get("/", Grupo_Empresa_Lista_PrecioController.getAll);

// 🔹 Obtener listas de precios asociadas a un grupo específico
router.get("/grupo/:id_grup_empresa", Grupo_Empresa_Lista_PrecioController.getByGrupo);

router.get("/listSinAsignar", Grupo_Empresa_Lista_PrecioController.getAllSinAsingar)
// 🔹 Crear nueva relación grupo ↔ lista de precio
router.post("/", Grupo_Empresa_Lista_PrecioController.create);

// 🔹 Actualizar una relación grupo ↔ lista de precio
router.put("/:id", Grupo_Empresa_Lista_PrecioController.update);


// 🔹 Eliminar relación grupo ↔ lista de precio
router.delete("/:id_grupo_empresa_lista_precio", Grupo_Empresa_Lista_PrecioController.delete);
export default router;
