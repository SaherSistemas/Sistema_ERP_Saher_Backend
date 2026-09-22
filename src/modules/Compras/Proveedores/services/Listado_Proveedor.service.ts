import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { Listado_ProveedorRepository } from '../repositories/Listado_Proveedor.repository';

export const Listado_ProveedorService = {
    getAllProveedoresConListados: async () => {
        return await Listado_ProveedorRepository.getAllProveedorConListados();
    },
    getProductoPorProveedorEnListas: async (cod_barra_pro_detlist: string) => {
        return await Listado_ProveedorRepository.getProductoPorProveedorEnListas(cod_barra_pro_detlist)
    },
    buscarProductosEnTodosLosListados: async (terminoBusqueda: string) => {
        return await Listado_ProveedorRepository.getProductosPorFiltro(terminoBusqueda);
    },
    procesarListado: async (filePath: string, body: any) => {
        const {
            id_proveedor,
            columna_codBarras,
            columna_Descripcion,
            columna_Existencia,
            columna_Precio,
            columna_FilaInicio
        } = body;

        if (!columna_codBarras || !columna_Descripcion || !columna_Existencia || !columna_Precio || !id_proveedor) {
            throw new Error("Faltan columnas obligatorias en el body");
        }

        const id_listado = uuidv4();
        const workbook = XLSX.readFile(path.resolve(filePath));
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: "A" });

        const filaInicio = Number(columna_FilaInicio - 1) || 0;
        const dataFiltrada = data.slice(filaInicio);

        const detalle = dataFiltrada.map((row: any) => ({
            id_detlist: uuidv4(),
            id_list_detlist: id_listado,
            cod_barra_pro_detlist: String(row[columna_codBarras] || '').trim(),
            descrip_pro_detlis: String(row[columna_Descripcion] || '').trim(),
            exist_pro_detlist: Number(row[columna_Existencia]) || 0,
            preio_pro_detlist: parseFloat(row[columna_Precio]) || 0.0,
        }));
        // Todo en una transacción con un lock por proveedor: si dos cargas del mismo proveedor llegan casi
        // al mismo tiempo (doble clic en "Subir"), la segunda espera a que la primera termine su
        // borrar+crear, en vez de que ambas borren y creen a la vez y el proveedor termine con 2 listados.
        const t = await dbLocal.transaction();
        try {
            await dbLocal.query(`SELECT pg_advisory_xact_lock(hashtext(:id))`, {
                replacements: { id: id_proveedor }, type: QueryTypes.SELECT, transaction: t,
            });
            await Listado_ProveedorRepository.eliminarListadoPorProveedor(id_proveedor, t);
            await Listado_ProveedorRepository.crearListado(id_listado, id_proveedor, t);
            await Listado_ProveedorRepository.insertarDetalles(detalle, t);
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        fs.unlinkSync(filePath);

        return "Archivo procesado correctamente";
    }
}


export default Listado_ProveedorService;
