import type { Request, Response } from "express"
import Pais from "../models/Pais"
export class PaisController {
    static getAll = async (req: Request, res: Response) => {
        const todosPaises = await Pais.findAll()

        res.status(201).json({ mensaje: todosPaises })
    }
    static create = async (req: Request, res: Response) => {
        try {

            const { nom_pais, cod_iso } = req.body;

            const ultimoPais = await Pais.findOne({
                order: [["id_pais", "DESC"]]
            });
            const nuevoId = ultimoPais.dataValues.id_pais ? ultimoPais.dataValues.id_pais + 1 : 1; // Si no hay registros, empieza en 1


            // Crear el nuevo país con el ID generado
            const nuevoPais = await Pais.create({
                id_pais: nuevoId,
                nom_pais,
                cod_iso
            });
            res.status(201).json('Pais creado correctamente')
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear el país" });
        }
    }
    static getById = async (req: Request, res: Response) => {
        console.log("DESDE APi")
    }
    static updateByID = async (req: Request, res: Response) => {
        console.log("DESDE PUIT")
    }
}