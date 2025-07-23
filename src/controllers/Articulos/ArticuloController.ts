import type { Request, Response } from "express";
import { ArticuloService } from '../../services/Articulos/articulo.service'

export class ArticuloController {
    static getAllPaginados = async (req: Request, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const query = (req.query.query as string) || '';

            const TodosArticulosParaCompra = await ArticuloService.getAllPaginado(page, limit, query);
            res.status(200).json(TodosArticulosParaCompra);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener los artículos." });
        }
    }


    static getAllParaCompra = async (req: Request, res: Response) => {
        try {
            const { id_empresasucursal } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const TodosArticulosParaCompra = await ArticuloService.getAllPagProductosParaCompra(page, limit, id_empresasucursal);
            res.status(200).json(TodosArticulosParaCompra)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todos los articulo." })
        }
    }

    static getAllArticulosNegadosParaCompra = async (req: Request, res: Response) => {
        try {  
            const { id_empresa_sucursal } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const articulosNegados = await ArticuloService.getAllArticulosNegadosParaCompra(id_empresa_sucursal, page, limit);
            res.status(200).json(articulosNegados);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todos los artículos negados." });
        }
    }

    static getPaginaArticuloParaContinuarCompra = async (req: Request, res: Response) => {
        try {
            const { id_artic } = req.params;
            const limit = parseInt(req.query.limit as string) || 1;

            const pagina = await ArticuloService.obtenerPaginaDeArticulo(id_artic, limit);
            res.json({ pagina });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ mensaje: error.message || 'Error al calcular la página del artículo' });
        }
    }
    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_articulo } = req.params;
            const articulo = await ArticuloService.getByID(id_articulo)
            res.status(200).json(articulo)
        } catch (error) {
            // console.error( error);
            res.status(500).json({ mensaje: "Error al encontrar todos los articulos." });
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newArticulo = await ArticuloService.createArticulo(data);
            res.status(201).json({ mensaje: 'Articulo creado correctamente.', articulo: newArticulo })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear el articulo." });
        }
    }

    static actualizarByID = async (req: Request, res: Response) => {
        try {
            const { id_articulo } = req.params;
            const data = req.body;
            const updateArticulo = await ArticuloService.updateByID(id_articulo, data);
            res.status(200).json({ mensaje: 'Articulo actualizado correctamente.', articulo: updateArticulo })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al actualizar el articulo." })
        }
    }
}