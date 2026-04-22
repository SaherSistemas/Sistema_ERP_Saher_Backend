import { v4 as uuidv4 } from 'uuid';

import { col, fn, Op, Sequelize } from 'sequelize';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

import { ICreateOAcumularDetallesSolicitados } from '../interface/Detalle_Compra_Solicitado.interface';
import Detalle_Compra_Solicitado from '../model/Detalle_Compra_Solicitado';
import Compra_Proveedor from '../model/Compra_Proveedor';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor';


export const Detalle_Compra_SolicitadoRepository = {
  cuentaDetalle: async (id_comp: string) => {
    const detalles = await Detalle_Compra_Solicitado.count({
      where: { idcompr_detcompsol: id_comp },
    });
    return detalles;
  },
  getByPK: async (id_detcompsol: string) => {
    return await Detalle_Compra_Solicitado.findByPk(id_detcompsol);
  },
  getAllArticulosPorCompra: async (id_comp: string) => {
    const detalles = await Detalle_Compra_Solicitado.findAll({
      where: { idcompr_detcompsol: id_comp },
      include: [{ model: Articulo }, { model: Compra_Proveedor }]
    });

    // Cantidades ya capturadas en facturas COMPLETADAS (no 'E')
    const capturados = await Detalle_Factura_Compra_Proveedor.findAll({
      where: { id_detcompsol: detalles.map(d => d.id_detcompsol) },
      include: [{
        model: Factura_Compra_Proveedor,
        where: { estado_factura_proveedor: { [Op.ne]: 'E' } },
        attributes: []
      }],
      attributes: [
        'id_detcompsol',
        [Sequelize.fn('SUM', Sequelize.col('cantidad_articulo_facturada')), 'totalCapturado']
      ],
      group: ['id_detcompsol'],
      raw: true
    });

    const capturadoPorDetalle: Record<string, number> = {};
    capturados.forEach((c: any) => {
      capturadoPorDetalle[c.id_detcompsol] = Number(c.totalCapturado || 0);
    });

    detalles.forEach(d => {
      const capturado = capturadoPorDetalle[d.id_detcompsol] || 0;
      d.setDataValue('cantidadCapturada', capturado);
      d.setDataValue('cantidadPendiente', d.cantidad_detcompsol - capturado);
    });

    return detalles;
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
    //  console.log("ROWWSS", rows);
    return Number((rows as any)?.total_transito ?? 0);
  },
  addDetallesCompraSolicitado: async (data: ICreateOAcumularDetallesSolicitados) => {
    //console.log("DATAAA", data);
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
          existente.cantidad_detcompsol = data.reemplazar
            ? detalle.cantidad_detcompsol          // ← corrige al nuevo valor
            : existente.cantidad_detcompsol + detalle.cantidad_detcompsol; // ← acumula (actual)
          await existente.save();
          return existente;
        } else {
          return await Detalle_Compra_Solicitado.create({
            id_detcompsol: uuidv4(),
            idcompr_detcompsol: data.id_compra,
            ...detalle
          });
        }
      })
    );

    return detallesProcesados;
  },

  deleteDetalleCompra: async (id_detcompsol: string) => {
    const detalle = await Detalle_Compra_Solicitado.findByPk(id_detcompsol);
    if (!detalle) throw new Error('Detalle no encontrado');
    await detalle.destroy();
    return { message: 'Eliminado correctamente' };
  },
};
