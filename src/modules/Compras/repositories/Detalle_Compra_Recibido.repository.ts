
import { col, fn, literal, Transaction } from 'sequelize';
import LotesRecibidosCompra from '../../../models/LotesYCaducidad/LotesRecibidosCompra';
import Articulo from '../../../models/Articulos/Articulo';
import Detalle_Compra_Recibidos from '../model/Detalle_Compra_Recibido'
import Compra_Proveedor from '../model/Compra_Proveedor';

export const Detalle_Compra_RecibidosRepository = {
  createDetallesCompraRecibido: async (detalles: any[], options?: { transaction?: Transaction }) => {
    return await Detalle_Compra_Recibidos.bulkCreate(detalles, {
      ...options,
      returning: true
    });
  },


  getCantidadTransitoPorArticulo: async (id_artic: string) => {
    const rows = await Detalle_Compra_Recibidos.findOne({
      attributes: [[fn('SUM', col('cantidad_detcomprec')), 'total_transito']],
      include: [
        {
          model: Compra_Proveedor,
          attributes: [],
          required: true,
          where: {
            estado_comp: ['L', 'K', 'R', 'H']
          }
        }
      ],
      where: { idarticulo_detcomprec: id_artic },
      raw: true
    });
    // console.log(rows);
    return Number((rows as any)?.total_transito ?? 0);
  },
  getByPK: async (id_detalle_recibido: string) => {
    return await Detalle_Compra_Recibidos.findByPk(id_detalle_recibido);
  },
  getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
    return await Detalle_Compra_Recibidos.findAll({
      where: { idcompr_detcomprec: id_comp },
      include: [{ model: LotesRecibidosCompra }, { model: Articulo }]
    });
  },
  getArticulosRecibidos: async (idcompr_detcomprec: string) => {
    return await Detalle_Compra_Recibidos.findAll({
      where: { idcompr_detcomprec }
    });
  },
  getArtuculoRecibido: async (id_detcomprec: string) => {
    return await Detalle_Compra_Recibidos.findByPk(id_detcomprec, {
      attributes: ['idarticulo_detcomprec']
    });
  },

  actualizarCantidadRecibidaReal: async (id_detalleRecibido: string, cantidadRealEntrada: number) => {
    const detalleRecibido = await Detalle_Compra_RecibidosRepository.getByPK(id_detalleRecibido);

    return await detalleRecibido.update({
      cantidad_detcomprec: cantidadRealEntrada
    });
  }
};
