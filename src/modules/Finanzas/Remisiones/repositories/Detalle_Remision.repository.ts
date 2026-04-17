import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Detalle_Remision from '../model/Detalle_Remision.model';
import { ICreateDetalleRemision } from '../interface/Remision.interface';

export const Detalle_RemisionRepository = {

    // Crear múltiples detalles para una remisión dentro de una transacción
    createMultiple: async (id_remision: string, detalles: ICreateDetalleRemision[], t: Transaction) => {
        const rows = detalles.map((d) => ({
            id_detalle_remision: uuidv4(),
            id_remision,
            id_articulo: d.id_articulo,
            descripcion_articulo: d.descripcion_articulo,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal,
            tasa_iva: d.tasa_iva,
            importe_iva: d.importe_iva,
        }));
        return await Detalle_Remision.bulkCreate(rows, { transaction: t });
    },

    // Obtener detalles de una remisión
    getByRemision: async (id_remision: string) => {
        return await Detalle_Remision.findAll({ where: { id_remision } });
    },
};
