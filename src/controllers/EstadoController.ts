import { request, type Request, type Response } from "express";
import Estado from "../models/Estado"
import Pais from "../models/Pais";

export class EstadoController {
    static getAllEstados = async (req: Request, res: Response) => {
        try {
            const estados = await Estado.findAll();
            res.status(201).json({ mensaje: estados })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los estados." });
        }
    }



    static getEstadoById = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params

            const estado = await Estado.findByPk(id_esta)

            if (!estado) {
                res.status(404).json({ error: "Estado no encontrado" });
                return;
            }
            res.json(estado)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener el estado." });
        }
    }



    static createEstado = async (req: Request, res: Response) => {
        try {
            const { id_pais_esta, nom_esta } = req.body;
            const ultimoEstado = await Estado.findOne({
                order: [["id_esta", "DESC"]]
            });
            const nuevoID = ultimoEstado ? ultimoEstado.dataValues.id_esta + 1 : 1;


            //Crear nuevo estado
            const nuevoEstado = await Estado.create({
                id_esta: nuevoID,
                id_pais_esta: id_pais_esta,
                nom_esta: nom_esta
            })

            res.status(201).json({
                mensaje: 'Estado creado correctamente', nuevoEstado
            })
        } catch (error) {

            //console.error(error);
            res.status(500).json({ message: "Error al crear el estado." });
        }
    }


    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params;

            const estado = await Estado.findByPk(id_esta);

            if (!estado) {
                res.status(404).json({ error: "Estado no encontrado." })
                return;
            }

            await estado.update(req.body)
            res.json('Estado actualizado correctamente.')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar el estado." });
        }
    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params

            const estado = await Estado.findByPk(id_esta)

            if (!estado) {
                res.status(404).json({ error: "Estado no encontrado." })
                return;
            }

            const statusContrario = !estado.activo_estado
            await estado.update({ activo_estado: statusContrario })

            res.json('Se cambio el estatus del estado correctamente.')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar el estado." });
        }
    }


}