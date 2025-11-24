import { v4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import { ILoteRecibidoChecado } from '../../interface/LotesYCaducidad/LotesRecibidosCompra.interface';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';

export const LoteRecibidoCompraRepository = {
  create: async (data: ILoteRecibidoChecado[], options?: { transaction?: Transaction }) => {
    const rows = data.map(d => ({
      ...d,
      fechavencimiento_lote:
        d.fechavencimiento_lote instanceof Date ? d.fechavencimiento_lote : new Date(d.fechavencimiento_lote),
      observacion_lote: d.observacion_lote ?? null
    }));
    return await LotesRecibidosCompra.bulkCreate(rows, options);
  },

  update: async (data: ILoteRecibidoChecado, options?: { transaction?: Transaction }) => {
    // console.log(data)
    return await LotesRecibidosCompra.update(
      {
        numerolote_lote: data.numerolote_lote,
        motivo_ajuste: data.motivo_ajuste,
        cantidad_lote: data.cantidad_lote,
        fechavencimiento_lote: data.fechavencimiento_lote
      },
      {
        where: {
          id_loterecibido: data.id_loterecibido,
          id_detallecompr_recibido: data.id_detallecompr_recibido
        },
        transaction: options?.transaction
      }
    );
  }
};
