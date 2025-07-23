import type { Request, Response } from "express";
import { Categoria_ArticuloService } from "../../services/Articulos/categoria_Articulo.service";

export class Categoria_ArticuloController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const { query } = req.query;
            const todasLasCategorias = await Categoria_ArticuloService.getAllCategoria(query as string);
            res.status(200).json({ mensaje: todasLasCategorias });
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las categorías." });
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_categoria } = req.params;
            const categoria_articulo = await Categoria_ArticuloService.getByID(id_categoria)
            res.status(200).json(categoria_articulo)
        } catch (error) {
            // console.error( error);
            res.status(500).json({ mensaje: "Error al encontrar la categoria del articulo" });
        }
    }
    static obtenerPorTipo = async (req: Request, res: Response) => {
        try {
            const { id_tipo_art } = req.params;
            const categoriasDeUnTipo = await Categoria_ArticuloService.obtenerPorTipo(id_tipo_art)
            res.status(200).json(categoriasDeUnTipo)
        } catch (error) {
            // console.error( error);
            res.status(500).json({ mensaje: "Error al encontrar la categoria del articulo" });
        }
    }



    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newCategoria_Articulo = await Categoria_ArticuloService.createCategoria(data);
            res.status(201).json({ mensaje: 'Categoria de articulo creada correctamente.', categoriaArticulo: newCategoria_Articulo })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear la unidad de medida." });
        }
    }

    static actualizarByID = async (req: Request, res: Response) => {
        try {
            const { id_categoria } = req.params;
            const data = req.body;
            const updateCategoria = await Categoria_ArticuloService.updateByID(id_categoria, data);
            res.status(200).json({ mensaje: 'Categoria de articulo actualizada correctamente.', categoriaArticulo: updateCategoria })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al actualizar la categoria del articulo." })
        }
    }
}