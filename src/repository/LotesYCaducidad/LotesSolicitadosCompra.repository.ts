import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import { IDataLotesRecibidos } from '../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface';
import Lotes_Solicitado_Compra from '../../models/LotesYCaducidad/LotesSolicitadoCompra';


import { Transaction } from "sequelize";

export const LotesSolicitadoCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    },
    create: async (data: IDataLotesRecibidos, t?: Transaction) => {
        const { id_comp, id_empleado_registro_lotes, productos } = data;

        const registros = productos.flatMap((producto) =>
            producto.lotes.map((lote) => ({
                id_compra_proveedor: id_comp,
                id_empleado_registro_lotes,
                id_detallecompr_recibido: lote.id_detallecompr_recibido,
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_lote: lote.cantidad_lote,
                observacion_lote: lote.observacion_lote ?? null
            }))
        );

        return await Lotes_Solicitado_Compra.bulkCreate(registros, {
            transaction: t
        });
    }

}