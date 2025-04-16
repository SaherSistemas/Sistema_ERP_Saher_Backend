import { request, type Request, type Response } from "express";
import { EstadoService } from "../../services/Lugares/estado.service";
import { ICreateEstado, IUpdateEstado } from "../../interface/Lugares/Estado.interface";

export class EstadoController {
    static getAllEstados = async (req: Request, res: Response) => {
        try {
            const todosEstados = await EstadoService.getAllEstados();
            res.status(201).json({ mensaje: todosEstados })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos los estados." });
        }
    }
    static getEstadosPorPais = async (req: Request, res: Response) => {
        try {

            const { id_pais_esta } = req.body
            const estadosPorPais = await EstadoService.getEstadosPorPais(id_pais_esta);
            res.status(201).json(estadosPorPais)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener los estados de este pais." });
        }
    }
    static getEstadoById = async (req: Request, res: Response) => {
        try {
            console.log("LLEGO AQUI")
            const { id_esta } = req.params

            const id_estaNumber = parseInt(id_esta)
            const estado = await EstadoService.getEstadoByID(id_estaNumber)
            res.json(estado)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener el estado." });
        }
    }

    static createEstado = async (req: Request<ICreateEstado>, res: Response) => {
        try {
            const data = req.body

            const newEstado = await EstadoService.createEstado(data)

            res.status(201).json('Estado creado correctamente.')
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear el estado." });
        }
    }


    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params;
            const data: IUpdateEstado = req.body;

            const idNumber = parseInt(id_esta);
            const updateEstado = await EstadoService.updateEstado(idNumber, data)

            res.status(201).json('Estado actualizado correctamente')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar el estado." });
        }
    }

    static cambiarEstatus = async (req: Request, res: Response) => {
        try {
            const { id_esta } = req.params
            const idNumber = parseInt(id_esta)
            const updateStatusEstado = await EstadoService.cambiarStatus(idNumber)


            res.status(201).json('Se cambio el estatus del estado correctamente.')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar el estado." });
        }
    }


}