import { Request, Response } from "express";
import { Grupo_Empresa_Lista_PrecioService } from "../../services/Costo_Y_Precio/Grupo_Empresa_Lista_Precio.service";

export class Grupo_Empresa_Lista_PrecioController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const grupoEmpresaListas = await Grupo_Empresa_Lista_PrecioService.getAll();
            res.status(200).json(grupoEmpresaListas);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener los grupos Lista", error });
        }
    };

    static getAllSinAsingar = async (req: Request, res: Response) => {
        try {
            const listasSinAsignar = await Grupo_Empresa_Lista_PrecioService.getListasSinAsignar();
            res.status(200).json(listasSinAsignar);
        } catch (error) {
            //  console.log(error)
            res.status(500).json({ message: "Error al obtener los grupos Lista", error });
        }
    }
    static delete = async (req: Request, res: Response) => {
        try {
            const { id_grupo_empresa_lista_precio } = req.params;
            await Grupo_Empresa_Lista_PrecioService.delete(id_grupo_empresa_lista_precio);
            res.status(200).json({ message: "Relación eliminada correctamente" });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message || "Error al eliminar la relación" });
        }
    };
    static getByGrupo = async (req: Request, res: Response) => {
        try {
            const { id_grup_empresa } = req.params
            const listasRelacionadasAlGrupo = await Grupo_Empresa_Lista_PrecioService.getPorGrupo(id_grup_empresa)
            res.status(200).json(listasRelacionadasAlGrupo)
        } catch (error) {
            res.status(500).json({ message: "Error al obtener los grupos Lista", error });
        }
    }
    static create = async (req: Request, res: Response) => {
        try {
            const nuevaLista = await Grupo_Empresa_Lista_PrecioService.create(req.body);
            res.status(201).json(nuevaLista);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    };

    static update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const actualizada = await Grupo_Empresa_Lista_PrecioService.update(id, req.body);
            res.status(200).json(actualizada);
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar Margen de Ganancia Lista", error });
        }
    };

}

