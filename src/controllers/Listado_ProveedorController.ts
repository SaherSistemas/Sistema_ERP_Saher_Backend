import type { Request, Response } from "express";
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid'
import path from "path";
import fs from "fs";
import Listado_Proveedor from "../models/Listados_Proveedor";
import Detalle_Listado_Proveedor from "../models/Detalle_Listado_Proveedor"

export class Listado_ProveedorController {
    static getAllProveedores = async (req: Request, res: Response) => {

    }

    static cargarListadosProveedor = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                res.status(404).json({ mensaje: "No se envio ningun archivo." })
                return
            }
            const { id_proveedor, codigo_barras, descripcion, existencia, precio, fila_inicio } = req.body;

            if (!codigo_barras || !descripcion || !existencia || !precio || !id_proveedor) {
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

            const filaInicio = Number(fila_inicio - 1) || 0;
            const dataFiltrada = data.slice(filaInicio); // Excluye encabezados si fila_inicio es mayor que 0


            const listadoDetalle = dataFiltrada.map((row) => ({
                id_detlist: uuidv4(),
                id_list_detlist: id_listado,
                cod_barra_pro_detlist: String(row[codigo_barras]).trim(),
                descrip_pro_detlis: String(row[descripcion]).trim(),
                exist_pro_detlist: Number(row[existencia]) || 0,
                preio_pro_detlist: parseFloat(row[precio]) || 0.0,
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