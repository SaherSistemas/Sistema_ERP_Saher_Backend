import type { Request, Response } from "express";
import { Proveedor_EmpresaService } from "../services/Proveedor_Empresa.service"
import { ICreateProveedorEmpresa } from "../interface/Proveedor_Empresa.interface";


export class Proveedor_EmpresaController {

    static proveedoresDeUnaEmpresa = async (req: Request, res: Response) => {
        try {
            const { id_prove } = req.params;
            const proveedoresPorUnaEmpresa = await Proveedor_EmpresaService.proveedorEmpresa(id_prove)
            res.status(200).json(proveedoresPorUnaEmpresa)
        } catch (error) {
            //console.error(error)
        }
    }

    static createProveedor_Empresa = async (req: Request<ICreateProveedorEmpresa>, res: Response) => {
        try {
            const { empresas } = req.body; // empresas sí es un array aquí
            const id_prove = req.params.id_prove

            await Proveedor_EmpresaService.deleteByProveedor(id_prove);

            const relaciones = await Promise.all(
                empresas.map(id_empre => {
                    Proveedor_EmpresaService.createProveedorEmpresa({ id_prove, id_empre })
                })
            )
            res.status(201).json({
                mensaje: "Relacion Proveedor-Empresa creada correctamente.",
                relaciones/*, relacion: newCreate*/
            })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al crear la relación proveedor-empresa." })
        }
    }
}