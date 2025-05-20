import type { Request, Response } from "express";
import { Empresa_SucursalService } from "../../services/Empresa_Sucursal/Empresa_Sucursal.service";
import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";

export class Empresa_SucursalController {
    static getAllEmpresas = async (req: Request, res: Response) => {
        try {
            const todasLasEmpresas = await Empresa_SucursalService.getAllEmpresas()
            res.status(201).json({ mensaje: todasLasEmpresas })
        } catch (error) {
            // console.error(error)
            res.status(500).json({ message: "Error al obtener todas las empresas." })
        }
    }
    static getEmpresaSucursalByID = async (req: Request, res: Response) => {
        try {
            const { id_empresaSucursal } = req.params;
            const empresa_sucursal = await Empresa_SucursalService.getEmpresaSucursalByID(id_empresaSucursal);
            res.status(201).json(empresa_sucursal)
        } catch (error) {
            //   console.error(error);
            res.status(500).json({ message: "No se encontro la empresa" });
        }
    }
    static crearEmpresaSucursal = async (req: Request<ICrearEmpresaSucursal>, res: Response) => {
        try {
            const data = req.body
            const nuevaEmpresa = await Empresa_SucursalService.createEmpresaSucursal(data)
            res.status(201).json({ mensaje: "Empresa creada correctamente.", empresa: nuevaEmpresa })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al crear la empresa" })
        }
    }
    static actualizarSucursal = async (req: Request, res: Response) => {
        try {
            const { id_empresaSucursal } = req.params;
            const data: IUpdateEmpresaSucursal = req.body;
            const updateSucursal = await Empresa_SucursalService.updateEmpresaSucursal(id_empresaSucursal, data);
            res.status(201).json({ mensaje: "Sucursal actualizada correctamente.", empresa: updateSucursal })
        } catch (error) {

        }
    }


    static cambiarStatus = async (req: Request, res: Response) => {

        try {
            const { id_empresaSucursal } = req.params;
            const updateStatusEmpresa = await Empresa_SucursalService.cambiarStatus(id_empresaSucursal)
            res.status(200).json({ mensaje: "Se cambio el estatus de la empresa correctamente.", empresa: updateStatusEmpresa })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error no se pudo cambiar el estatus de la empresa." })
        }
    }

}