import type { Request, Response } from "express";
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid'
import path from "path";
import fs from "fs";
import Listado_Proveedor from "../models/Proveedor/Listados_Proveedor";
import Detalle_Listado_Proveedor from "../models/Proveedor/Detalle_Listado_Proveedor"

export class Listado_ProveedorController {
    static getAllProveedores = async (req: Request, res: Response) => {

    }

    static cargarListadosProveedor = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                res.status(404).json({ mensaje: "No se envio ningun archivo." })
                return
            }
            const { id_proveedor, columna_codBarras, columna_Descripcion, columna_Existencia, columna_Precio, columna_FilaInicio } = req.body;

            if (!columna_codBarras || !columna_Descripcion || !columna_Existencia || !columna_Precio || !id_proveedor) {
                res.status(400).json({ message: "Faltan columnas en el body" });
                return
            }

            //GENERAR UIID DEL LISTADO
            const id_listado = uuidv4();


            const filePath = path.resolve(req.file.path);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convertir a JSON usando las referencias de columna

            const data = XLSX.utils.sheet_to_json<{ [key: string]: any }>(sheet, { header: "A" });

            const filaInicio = Number(columna_FilaInicio - 1) || 0;
            const dataFiltrada = data.slice(filaInicio); // Excluye encabezados si columna_FilaInicio es mayor que 0


            const listadoDetalle = dataFiltrada.map((row) => ({
                id_detlist: uuidv4(),
                id_list_detlist: id_listado,
                cod_barra_pro_detlist: String(row[columna_codBarras]).trim(),
                descrip_pro_detlis: String(row[columna_Descripcion]).trim(),
                exist_pro_detlist: Number(row[columna_Existencia]) || 0,
                preio_pro_detlist: parseFloat(row[columna_Precio]) || 0.0,
            }))

            const nuevoListado = await Listado_Proveedor.create({
                id_listprove: id_listado,
                id_prove_listprove: id_proveedor,
            })

            const detallesListado = await Detalle_Listado_Proveedor.bulkCreate(listadoDetalle, { updateOnDuplicate: ["cod_barra_pro_detlist", "descrip_pro_detlis", "exist_pro_detlist", "preio_pro_detlist"] })


            fs.unlinkSync(filePath); // 

            res.json({ message: "Archivo procesado correctamente" });
        } catch (error) {
            console.log(error)
        }
    }
}