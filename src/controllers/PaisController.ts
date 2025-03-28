import type { Request, Response } from "express"
import Pais from "../models/Pais"
export class PaisController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPaises = await Pais.findAll()

            res.status(201).json({ mensaje: todosPaises })
        } catch (error) {

            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los paises." });
        }

    }
    static create = async (req: Request, res: Response) => {
        try {

            const { nom_pais, cod_iso } = req.body;

            const ultimoPais = await Pais.findOne({
                order: [["id_pais", "DESC"]]
            });
            const nuevoId = ultimoPais ? ultimoPais.dataValues.id_pais + 1 : 1; // Si no hay registros, empieza en 1


            // Crear el nuevo país con el ID generado
            const nuevoPais = await Pais.create({
                id_pais: nuevoId,
                nom_pais,
                cod_iso
            });
            res.status(201).json('Pais creado correctamente')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear el país." });
        }
    }
    static getById = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params

            const pais = await Pais.findByPk(id_pais)

            if (!pais) {
                res.status(404).json({ error: "País no encontrado." });
                return;
            }
            res.json(pais)
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al encontrar el estado." })
        }

    }
    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params

            const pais = await Pais.findByPk(id_pais)

            if (!pais) {
                res.status(404).json({ error: "País no encontrado" });
                return;
            }

            await pais.update(req.body)
            res.json('Pais actualizado correctamente.')
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al modificar el pais." })
        }

    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_pais } = req.params

            const pais = await Pais.findByPk(id_pais)

            if (!pais) {
                res.status(404).json({ error: "Pais no encontrado" })
                return;
            }

            const estadoContrario = !pais.activo_pais
            await pais.update({ activo_pais: estadoContrario })

            res.json('Se cambio el estatus del pais correctamente.')
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al cambiar el estado del pais." })
        }

    }
}