import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'

import { ProveedorService } from "../../services/Proveedor/Proveedor.service";
import { ICreateProveedor, IProveedorUpdateBody } from "../../interface/Proveedor/Proveedor.interface";

export class ProveedorController {
    static getAllProveedores = async (req: Request, res: Response) => {
        try {
            const proveedores = await ProveedorService.getAllProveedores();
            res.status(200).json({ mensaje: proveedores })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }

    static crearProveedor = async (req: Request<ICreateProveedor>, res: Response) => {
        try {
            const data = req.body
            const newProveedor = await ProveedorService.crearProveedor(data)
            res.status(201).json({ mensaje: "Proveedor creado correctamente.", proveedor: newProveedor })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al crear el proveedor." });
        }
    }

    static getByIdProveedor = async (req: Request, res: Response) => {
        try {
            const { id_prove } = req.params;
            const proveedor = await ProveedorService.getByIdProveedor(id_prove);
            res.status(200).json(proveedor)
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "No se encontro el proveedor" })
        }
    }

    static cambiarStatus = async (req: Request, res: Response) => {
        try {
            const { id_prove } = req.params;
            const updateStatusProveedor = await ProveedorService.cambiarStatus(id_prove);
            res.status(200).json({ mensaje: "Se cambio el estatus del proveedor", proveedor: updateStatusProveedor })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ message: "Error al cambiar el estatus del proveedor." })
        }
    }

    static updateProveedor = async (req: Request<{ id_prove: string }, any, IProveedorUpdateBody>, res: Response) => {
        try {
            const { id_prove } = req.params;
            const data = req.body;
            const updateProveedor = await ProveedorService.updateProveedor(id_prove, data)

            res.status(200).json({ mensaje: "Proveedor actualizado correctamente." })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al actualizar el proveedor." })
        }
    }
}