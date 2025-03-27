import { Router } from "express";
import { CiudadController } from "../controllers/CiudadController";
const router = Router()

router.get('/', CiudadController.getAllCiudades)
/*
router.post('/', BudgetController.create)
router.get('/:id', BudgetController.getById)
router.put('/', BudgetController.create)*/