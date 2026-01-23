import type { Request, Response } from "express";
import { Grupo_EmpresaService } from "../../../services/Empresa_Sucursal/Grupo_Empresa.service";
import { ICrearGrupoEmpresa } from "../../../interface/Empresa_Sucursal/Grupo_Empresa.interface";

export class Grupo_EmpresaController {
    static getAllGrupoEmpresas = async (req: Request, res: Response) => {
        try {
            const gruposEmpresa = await Grupo_EmpresaService.getAllGrupoEmpresa()
            res.status(200).json({ mensaje: gruposEmpresa })
        } catch (error) {
            // console.error(error)
            res.status(500).json({ message: "Error al obtener todos los grupos de empresa." })
        }
    }
    static getGrupoEmpresaByID = async (req: Request, res: Response) => {
        try {
            const { id_grupoEmpresa } = req.params;
            const grupo_empresa = await Grupo_EmpresaService.getGrupoEmpresaByID(id_grupoEmpresa);
            res.status(200).json(grupo_empresa)
        } catch (error) {
            //    console.error(error);
            res.status(500).json({ message: "No se encontro el grupo de empresa" });
        }
    }
    static crearGrupoEmpresa = async (req: Request<ICrearGrupoEmpresa>, res: Response) => {
        try {
            const data = req.body
            const nuevaGrupo = await Grupo_EmpresaService.createGrupoEmpresa(data)
            res.status(201).json({ mensaje: "Grupo creado correctamente.", grupo: nuevaGrupo })
        } catch (error) {
            //  console.error(error)
            res.status(500).json({ message: "Error al crear el grupo de empresa" })
        }
    }
    static actualizarGrupoEmpresa = async (req: Request, res: Response) => {
        try {
            const { id_grupoEmpresa } = req.params;
            const data: ICrearGrupoEmpresa = req.body;
            const updateGrupo = await Grupo_EmpresaService.updateGrupoEmpresa(id_grupoEmpresa, data);
            res.status(200).json({ mensaje: "Grupo actualizado correctamente.", grupo: updateGrupo })
        } catch (error) {
            //  console.error(error)
            res.status(500).json({ message: "Error al crear el grupo de empresa" })
        }
    }



}