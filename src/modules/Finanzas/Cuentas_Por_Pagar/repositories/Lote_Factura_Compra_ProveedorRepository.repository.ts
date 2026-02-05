import { ICrearLotesFacturaRepoDTO } from "../interface/Lote_Factura_Compra_Proveedor.interface";
import Lote_Factura_Compra_Proveedor from "../model/Lote_Factura_Compra_Proveedor";
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";

export const Lote_Factura_Compra_ProveedorRepository = {


    createMultiple: async (payload: ICrearLotesFacturaRepoDTO, t?: Transaction) => {
        const rows = payload.lotes.map(l => ({
            id_lote_factura_compra_proveedor: uuidv4(),
            id_det_factura_proveedor: l.id_det_factura_proveedor,
            numero_lote: l.numero_lote,
            precio_articulo_factura: l.precio_articulo_factura,
            fecha_caducidad: l.fecha_caducidad,
            cantidad_lote: l.cantidad_lote,
            observacion_lote: l.observacion_lote ?? null
        }));

        return await Lote_Factura_Compra_Proveedor.bulkCreate(rows, {
            transaction: t
        });
    }
};