import type { Request, Response } from "express";
import Listado_ProveedorService from "../services/Listado_Proveedor.service";

export class Listado_ProveedorController {
    static getAllProveedoresConListado = async (req: Request, res: Response) => {
        try {
            const proveedoresConListado = await Listado_ProveedorService.getAllProveedoresConListados();
            res.status(200).json(proveedoresConListado)
        } catch (error) {
            // console.error(error)
            res.status(500).json({ message: "Error al mostrar los listados" })
        }
    }
    static getProductPorProveedorListado = async (req: Request, res: Response) => {
        try {
            const { cod_barra_pro_detlist } = req.params;
            const articulo = await Listado_ProveedorService.getProductoPorProveedorEnListas(cod_barra_pro_detlist)
            res.status(200).json(articulo)
        } catch (error) {
            //  console.error(error)
            res.status(500).json({ message: "No se encontro el producto en los listados." })
        }
    }


    static buscarProductosEnTodosLosListados = async (req: Request, res: Response) => {
        try {
            const terminoBusqueda = req.query.termBusqueda;
            const resultados = await Listado_ProveedorService.buscarProductosEnTodosLosListados(terminoBusqueda as string);
            res.json(resultados);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: 'Error al buscar productos' });
        }
    }
    static async cargarListadosProveedor(req: Request, res: Response) {
        try {
            if (!req.file) {
                res.status(400).json({ mensaje: "No se envió ningún archivo." });
            }

            const result = await Listado_ProveedorService.procesarListado(req.file.path, req.body);
            res.status(200).json({ message: "Archivo procesado correctamente" });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: "Error al procesar el archivo." });
        }
    }

}