import type { Request, Response } from "express"
import { PaisService } from "../../services/Lugares/pais.service"
import { ICreatePais, IUpdatePais } from "../../interface/Lugares/Pais.interface";
export class PaisController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPaises = await PaisService.getAllPaises();
            res.status(201).json({ mensaje: todosPaises })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los paises." });
        }

    }
    static create = async (req: Request<ICreatePais>, res: Response) => {
        try {
            const data = req.body
            const newPais = await PaisService.createPais(data)
            res.status(201).json('Pais creado correctamente')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear el país." });
        }
    }
    static getById = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params

            const idPaisNumber = parseInt(id_pais)
            const pais = await PaisService.getPaisById(idPaisNumber)
            res.status(201).json(pais)
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al encontrar el pais." })
        }

    }
    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params
            const data: IUpdatePais = req.body

            const IdNumber = parseInt(id_pais)
            const updatedPais = await PaisService.updatePais(IdNumber, data)

            res.status(201).json('Pais actualizado correctamente.')
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al modificar el pais." })
        }

    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params
            const IdNumber = parseInt(id_pais)

            const updateStatusPais = await PaisService.cambiarStatus(IdNumber)

            res.status(201).json('Se cambio el estatus del pais correctamente.')
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al cambiar el estado del pais." })
        }

    }
}