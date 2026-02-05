
import { col, fn, literal, Op, Transaction } from 'sequelize';
import LotesRecibidosCompra from '../../../../models/LotesYCaducidad/LotesRecibidosCompra';

import Detalle_Compra_Recibidos from '../model/Detalle_Compra_Recibido'
import Compra_Proveedor from '../model/Compra_Proveedor';
import { IModificarLotesDetalleFacturaDTO } from '../../../Finanzas/Cuentas_Por_Pagar/interface/Detalle_Factura_Compra_Proveedor.interface';
import { Detalle_Factura_Compra_ProveedorRepository } from '../../../Finanzas/Cuentas_Por_Pagar/repositories/Detalle_Factura_Compra_Proveedor.repository';
import { Detalle_Compra_SolicitadoRepository } from './Detalle_Compra_Solicitado.repository';
import { IDetalleCompraRecibidoPayload } from '../interface/Detalle_Compra_Recibido.interface';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import Detalle_Compra_Recibido from '../model/Detalle_Compra_Recibido';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

export const Detalle_Compra_RecibidosRepository = {
  getByDetalleFactura: async (id_factura_proveedor_detalle: string, opts?: any) => {
    return await Detalle_Compra_Recibido.findOne({
      where: { id_detalle_factura_compra_proveedor: id_factura_proveedor_detalle },
      ...opts,
    });
  },
  updateDetallesCompraRecibido: async (id_detcomprec: string, payload: any, opts?: any) => {
    const [_, [row]] = await Detalle_Compra_Recibido.update(payload, {
      where: { id_detcomprec },
      returning: true,
      ...opts,
    });
    return row;
  },
  updateLoteDetalleComproRecibido: async (
    data: IModificarLotesDetalleFacturaDTO,
    t?: Transaction
  ) => {
    const { id_factura_proveedor_detalle, lotes } = data;

    const todo_el_detalle =
      await Detalle_Factura_Compra_ProveedorRepository.getByPK(id_factura_proveedor_detalle);

    if (!todo_el_detalle) {
      throw new Error("Detalle factura proveedor no encontrado");
    }

    const detalleSolicitado =
      await Detalle_Compra_SolicitadoRepository.getByPK(todo_el_detalle?.id_detcompsol || "");

    if (!detalleSolicitado) {
      throw new Error("Detalle compra solicitado no encontrado");
    }

    const cantidadTotalLotes = (lotes || []).reduce(
      (total, lote) => total + Number(lote.cantidad_lote || 0),
      0
    );

    // =========================
    // 1) OBTENER O CREAR DETALLE_COMPRA_RECIBIDO (NO CREAR SIEMPRE UNO NUEVO)
    // =========================
    const existente = await Detalle_Compra_RecibidosRepository.getByDetalleFactura(
      id_factura_proveedor_detalle,
      { transaction: t }
    );
    // ↑ crea este método: buscar por id_detalle_factura_compra_proveedor

    let detalleCompraRecibido: any;

    const payloadDetalleCompraRecibido = {
      idcompr_detcomprec: detalleSolicitado.idcompr_detcompsol, // revisa si esto es correcto
      idarticulo_detcomprec: detalleSolicitado.idarticulo_detcompsol,
      cantidad_detcomprec: cantidadTotalLotes,
      precio_detcomprec: detalleSolicitado.precio_detcompsol,
      id_detalle_factura_compra_proveedor: todo_el_detalle.id_factura_proveedor_detalle,
    };

    if (existente) {
      detalleCompraRecibido = await Detalle_Compra_RecibidosRepository.updateDetallesCompraRecibido(
        existente.id_detcomprec,
        payloadDetalleCompraRecibido,
        { transaction: t }
      );
    } else {
      detalleCompraRecibido = await Detalle_Compra_RecibidosRepository.createDetallesCompraRecibido(
        payloadDetalleCompraRecibido,
        { transaction: t }
      );
    }

    // =========================
    // 2) SYNC DE LOTES (UPSERT + DELETE)
    // =========================
    const SUFIJO = "(FISICAMENTE VIENE ESTE LOTE)";

    // 2.1 ids que vienen en el payload (los que deben quedarse)
    const incomingIds = new Set<string>();

    for (const l of lotes ?? []) {
      const id =
        (l.__local_id && String(l.__local_id)) || // <-- este debe ser el id real del lote recibido
        randomUUID();

      incomingIds.add(id);

      const observBase = (l.observacion_lote ?? "").trim();
      const observCreate =
        observBase.length === 0
          ? SUFIJO
          : observBase.includes(SUFIJO)
            ? observBase
            : `${observBase} ${SUFIJO}`;

      // upsert manual
      const [affected] = await LotesRecibidosCompra.update(
        {
          numerolote_lote: (l.numero_lote ?? "").trim(),
          fechavencimiento_lote: l.fecha_caducidad || null,
          cantidad_lote: Number(l.cantidad_lote) || 0,
          observacion_lote: observCreate,
          id_detallecompr_recibido: detalleCompraRecibido.id_detcomprec,
        },
        { where: { id_loterecibido: id }, transaction: t }
      );

      if (affected === 0) {
        await LotesRecibidosCompra.create(
          {
            id_loterecibido: id,
            id_detallecompr_recibido: detalleCompraRecibido.id_detcomprec,
            numerolote_lote: (l.numero_lote ?? "").trim(),
            fechavencimiento_lote: l.fecha_caducidad || null,
            cantidad_lote: Number(l.cantidad_lote) || 0,
            observacion_lote: observCreate,
          },
          { transaction: t }
        );
      }
    }

    // 2.2 borrar los lotes existentes en BD que YA NO vienen en payload
    await LotesRecibidosCompra.destroy({
      where: {
        id_detallecompr_recibido: detalleCompraRecibido.id_detcomprec,
        id_loterecibido: { [Op.notIn]: Array.from(incomingIds) }, // <-- require Op
      },
      transaction: t,
    });

    return { ok: true, total: (lotes ?? []).length };
  },
  createDetallesCompraRecibido: async (detalles: IDetalleCompraRecibidoPayload, options?: { transaction?: Transaction }) => {
    // console.log("DETALLES A CREAR EN REPO:", detalles);
    return await Detalle_Compra_Recibidos.create({
      id_detcomprec: uuidv4(),
      ...detalles
    }, {
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
