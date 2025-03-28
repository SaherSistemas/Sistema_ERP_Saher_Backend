import { Router } from "express";
import { CiudadController } from "../controllers/CiudadController";
const router = Router()

router.get('/', CiudadController.getAllCiudades)
