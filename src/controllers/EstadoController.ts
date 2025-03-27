import type { Request, Response } from "express";
import Estado from "../models/Estado"

export class EstadoController {
    static getAllEstados = async (req: Request, res: Response) => {
        console.log("Desde la API")
    }
}