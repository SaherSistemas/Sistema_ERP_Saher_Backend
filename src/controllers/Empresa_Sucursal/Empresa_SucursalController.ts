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
    static crearEmpresaSucursal = async (req: Request<ICrearEmpresaSucursal>, res: Response) => {
        try {
            const data = req.body
            const nuevaEmpresa = await Empresa_SucursalService.createEmpresaSucursal(data)
            res.status(201).json("Empresa creada correctamente.")
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "Error al crear la empresa" })
        }
    }

}