import type { Request, Response } from "express";
import { Tipo_ArticuloService } from "../services/tipo_Articulo.service";
import { ICreateOrUpdateTipo_Articulo } from "../interface/Tipo_Articulo.interface";

export class Tipo_ArticuloController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todos_TipoArticulo = await Tipo_ArticuloService.getAll();
            res.status(200).json({ mensaje: todos_TipoArticulo });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener los tipo de articulo." })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const crearNewTipoArticulo = await Tipo_ArticuloService.createTipoArticulo(data);
            res.status(201).json({ mensaje: 'Tipo de articulo creado correctamente.', tipo_articulo: crearNewTipoArticulo })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al crear el tipo de IVA.' })
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_tipo_art } = req.params;
            const data: ICreateOrUpdateTipo_Articulo = req.body;
            const updateTipoArticulo = await Tipo_ArticuloService.updateTipoArticulo(id_tipo_art, data)
            res.status(200).json({ mensaje: 'Tipo de articulo actualizado correctamente.', tipo_articulo: updateTipoArticulo });
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: error.message || 'Error desconocido al actualizar el tipo de articulo.' })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_tipo_art } = req.params;
            const tipoArticulo = await Tipo_ArticuloService.getByID(id_tipo_art);
            res.status(200).json(tipoArticulo)
        } catch (error) {
            res.status(500).json({ mensaje: "Error al encontrar el tipo de articulo." })
        }
    }
}