import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'

import { ProveedorService } from "../services/Proveedor/Proveedor.service";
import { ICreateProveedor, IProveedor } from "../interface/Proveedor/Proveedor.interface";

export class ProveedorController {
    static getAllProveedores = async (req: Request, res: Response) => {
        try {
            const proveedores = await ProveedorService.getAllProveedores();
            res.status(201).json({ mensaje: proveedores })
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

        }
    }
}