import { v4 as uuidv4 } from 'uuid';

import { col, fn } from 'sequelize';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

import { ICreateOAcumularDetallesSolicitados } from '../interface/Detalle_Compra_Solicitado.interface';
import Detalle_Compra_Solicitado from '../model/Detalle_Compra_Solicitado';
import Compra_Proveedor from '../model/Compra_Proveedor';
export const Detalle_Compra_SolicitadoRepository = {
  getByPK: async (id_detcompsol: string) => {
    return await Detalle_Compra_Solicitado.findByPk(id_detcompsol);
  },
  getAllArticulosPorCompra: async (id_comp: string) => {
    return await Detalle_Compra_Solicitado.findAll({
      where: { idcompr_detcompsol: id_comp },
      include: [
        {
          model: Articulo
        },
        {
          model: Compra_Proveedor
        }
      ]
    });
  },
  getCantidadTransitoPorArticulo: async (id_artic: string) => {
    const rows = await Detalle_Compra_Solicitado.findOne({
      attributes: [[fn('SUM', col('cantidad_detcompsol')), 'total_transito']],
      include: [
        {
          model: Compra_Proveedor,
          attributes: [],
          required: true,
          where: {
            estado_comp: ['C', 'A', 'E', 'L', 'K']
          }
        }
      ],
      where: { idarticulo_detcompsol: id_artic },
      raw: true
    });
    console.log("ROWWSS", rows);
    return Number((rows as any)?.total_transito ?? 0);
  },
  addDetallesCompraSolicitado: async (data: ICreateOAcumularDetallesSolicitados) => {
    const detallesProcesados = await Promise.all(
      data.detalles.map(async detalle => {
        const existente = await Detalle_Compra_Solicitado.findOne({
          where: {
            idcompr_detcompsol: data.id_compra,
            idarticulo_detcompsol: detalle.idarticulo_detcompsol,
            precio_detcompsol: detalle.precio_detcompsol
          }
        });

        if (existente) {
          // Acumular la cantidad si ya existe
          existente.cantidad_detcompsol += detalle.cantidad_detcompsol;
          await existente.save();
          return existente;
        } else {
          // Crear nuevo si no existe
          return await Detalle_Compra_Solicitado.create({
            id_detcompsol: uuidv4(),
            idcompr_detcompsol: data.id_compra,
            ...detalle
          });
        }
      })
    );

    return detallesProcesados;
  }
};
