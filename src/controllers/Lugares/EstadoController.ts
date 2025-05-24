import type { Request, Response } from "express";
import { EstadoService } from "../../services/Lugares/estado.service";
import { ICreateEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface";

export class EstadoController {

    static getAllEstados = async (req: Request, res: Response) => {
        try {
            const todosEstados = await EstadoService.getAllEstados();
            res.status(200).json({ mensaje: todosEstados });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener todos los estados." });
        }
    }
    static getAllActivos = async (req: Request, res: Response) => {
        try {
            const estadosActivos = await EstadoService.getAllEstadoActivo();
            res.status(200).json({ mensaje: estadosActivos })
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Error al obtener todos los países." });
        }
    }

    static getEstadosPorPais = async (req: Request, res: Response) => {
        try {
            const { id_pais_esta } = req.params;
            const estadosPorPais = await EstadoService.getEstadosPorPais(id_pais_esta);
            res.status(200).json(estadosPorPais);
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Error al obtener los estados del país." });
        }
    }

    static getEstadoById = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params;
            const estado = await EstadoService.getEstadoByID(id_esta);
            res.status(201).json(estado);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener el estado." });
        }
    }

    static createEstado = async (req: Request<{}, {}, ICreateEstado>, res: Response) => {
        try {
            const data = req.body;
            const newEstado = await EstadoService.createEstado(data);
            res.status(201).json({ mensaje: "Estado creado correctamente.", estado: newEstado });
        } catch (error) {
            //console.log(error)
            res.status(500).json({ message: error.message });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params;
            const data: IUpdateEstado = req.body;
            const updateEstado = await EstadoService.updateEstado(id_esta, data);
            res.status(200).json({ mensaje: "Estado actualizado correctamente.", estado: updateEstado });
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Error al modificar el estado." });
        }
    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params;
            const updateStatusEstado = await EstadoService.cambiarStatus(id_esta);
            res.status(200).json({ mensaje: "Se cambió el estatus del estado correctamente.", estado: updateStatusEstado });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
