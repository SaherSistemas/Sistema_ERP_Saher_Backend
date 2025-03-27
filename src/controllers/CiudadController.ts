import type { Request, Response } from "express";
import Ciudad from "../models/Ciudad"
export class CiudadController {
    static getAllCiudades = async (req: Request, res: Response) => {
        console.log("HOLA DESDE LA API ")
    }
}