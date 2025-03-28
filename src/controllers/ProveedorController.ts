import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid'
import Proveedor from "../models/Proveedor";

export class ProveedorController {
    static getAllProveedores = async (req: Request, res: Response) => {
        try {
            const proveedores = await Proveedor.findAll();
            res.status(201).json({ mensaje: proveedores })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al mostrar todos los proveedores." });
        }
    }

    static crearCiudad = async (req: Request, res: Response) => {
        try {
            const { nomcort_prove, razsoc_prove, rfc_prove, calle_prove, id_ciud_prove, cp_prove, telef_prove,
                corr_prove, diascre_prove, limicre_prove, plazoentrega_prove, ctabanca_prove, condpago_prove
            } = req.body;

            const id_prove = uuidv4();

            const nuevoProveedor = await Proveedor.create({
                id_prove, nomcort_prove, razsoc_prove,
                rfc_prove, calle_prove, id_ciud_prove,
                cp_prove, telef_prove, corr_prove,
                diascre_prove, limicre_prove,
                plazoentrega_prove, ctabanca_prove, condpago_prove
            })

            res.status(201).json({
                mensaje: 'Proveedor creado correctamente.', nuevoProveedor
            })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear el nuevo proveedor" });
        }
    }
}