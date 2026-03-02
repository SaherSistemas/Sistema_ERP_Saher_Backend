import Venta from "../../models/Venta/Venta";
import DetalleVenta from "../../models/Venta/Detalle_Venta";
import LoteUsadoVenta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";

import {
  ICreateOrUpdateVenta,
  IVentaInput,
} from "../../interface/Venta/Venta.interface";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from "uuid";
import Metodo_de_Pago from "../../models/Caja/Metodo_de_Pago";
import Venta_Pago from "../../models/Venta/Venta_Pago";
import { RecetaMedicaService } from "../../services/RecetaMedica/RecetaMedica.service";
import { DetalleLookupMap } from "../../services/Venta/Venta.service";

import Empleado from "../../modules/RRHH/model/Empleado";
import Lote_Usado_Venta from "../../models/LotesYCaducidad/Lote_Usado_Venta";
import Detalle_Venta from "../../models/Venta/Detalle_Venta";
import LoteArticuloSucursal from "../../modules/Inventario/Lotes/model/Lote_Articulo_Sucursal";
import Articulo from "../../modules/Catalogos/Articulos/model/Articulo";

const ventaIncludes = [
  {
    model: DetalleVenta,
    as: "detalle_venta",
    required: false,
    include: [
      {
        model: LoteUsadoVenta,
        as: "lote_usado",
        required: false,
      },
    ],
  },
  {
    model: Venta_Pago,
    as: "venta_pago",
    required: false,
    include: [
      {
        model: Metodo_de_Pago,
        as: "metodo_pago",
        required: false,
      },
    ],
  },
];

const ListaVentas = [
  {
    model: DetalleVenta,
    as: "detalle_venta",
    attributes: ["id_venta", "cantidad", "precio_unitario"],
    include: [
      {
        model: Articulo,
        as: "articulo",
        attributes: ["des_artic", "id_artic",],
      },
      {
        model: LoteUsadoVenta,
        as: "lote_usado",
        include: [
          {
            model: LoteArticuloSucursal,
            as: "lote",
            attributes: [
              "id_lote_sucursal",
              "numero_lote_sucursal",
              "fecha_venci_lote_sucursal",
              "cantidad_entrada_lote"
            ],
          },
        ],

      },
    ],

  },
  {
    model: Venta_Pago,
    as: "venta_pago",
    attributes: ["monto"],
    include: [
      {
        model: Metodo_de_Pago,
        as: "metodo_pago",
        attributes: ["nombre_metodo_pago"],
      },
    ],
  },
]



export const VentaRepository = {


  getAll: async () => {
    return await Venta.findAll({});
  },


  getVentaCompleta: async (id_venta: string, options: any = {}) => {
    return await Venta.findOne({
      where: { id_venta },
      include: [
        {
          model: Detalle_Venta,
          as: "detalle_venta",
          include: [
            {
              model: Lote_Usado_Venta,
              as: "lote_usado",
            },
          ],
        },
        {
          model: Venta_Pago,
          as: "venta_pago",
        },
      ],
      transaction: options.transaction,
      lock: options.lock,
    });
  },


  cancelarVenta: async (id_venta: string, motivo: string, options: any = {}) => {
    return await Venta.update(
      {
        status_venta: "CANCELADA",
        motivo_cancelacion: motivo,
        fecha_cancelacion: new Date(),
      },
      {
        where: { id_venta },
        transaction: options.transaction,
      }
    );
  },

  getResumenCorte: async (id_corte: string) => {
    return await Venta.findAll({
      where: {
        id_corte,
        status_venta: 'CONFIRMADA'
      },
      attributes: [
        "id_venta",
        "total_venta"
      ],
      include: [
        ...ListaVentas,
        {
          model: Empleado,
          attributes: ["id_empleado", "nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"]
        }
      ],
      order: [['createdAt', 'DESC']],
    });
  },

  getById: async (
    id_venta: string,
    options?: { transaction?: Transaction }
  ) => {
    if (!isUUID(id_venta)) return null;
    return Venta.findByPk(id_venta, {
      include: ventaIncludes,
      transaction: options?.transaction,
    });
  },

  create: async (
    input: IVentaInput,
    options?: { transaction?: Transaction }
  ) => {
    const run = async (t: Transaction) => {
      const {
        detalle_venta = [],
        venta_pago = [],
        recetaPayload,
        ...ventaData
      } = input as any;
      if (ventaData.id_venta == null) delete (ventaData as any).id_venta;

      const id_venta = uuidv4();
      const venta = await Venta.create(
        {
          ...ventaData,
          id_venta,
        },
        { transaction: t }
      );

      // crear detalle
      let createdDetalleModels: DetalleVenta[] = [];

      if (detalle_venta.length) {
        const payloadDetalles = detalle_venta.map((d: any) => ({
          id_venta,
          id_artic: d.id_artic,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          temp_line_id: d.temp_line_id ?? null,
        }));

        createdDetalleModels = await DetalleVenta.bulkCreate(payloadDetalles, {
          transaction: t,
          returning: true,
        });
      }

      const totalVenta = createdDetalleModels.reduce((acc, det) => {
        return acc + Number(det.cantidad) * Number(det.precio_unitario);
      }, 0);

      await venta.update({ total: totalVenta }, { transaction: t });

      if (venta_pago.length) {
        const payloadPagos = venta_pago.map((p: any) => ({
          id_venta,
          id_metodo_pago: p.id_metodo_pago,
          monto: p.monto,
        }));
        await Venta_Pago.bulkCreate(payloadPagos, { transaction: t });
      }

      const tempMap: DetalleLookupMap = new Map();

      for (const d of createdDetalleModels) {
        const temp = (d as any).temp_line_id as string | null;
        if (!temp) continue;

        const id_articulo = (d as any).id_artic ?? (d as any).id_articulo;

        if (!id_articulo)
          throw new Error("Falta id_articulo en detalle_venta.");

        tempMap.set(temp, {
          id_detalle_venta: d.id_detalle_venta,
          id_articulo,
        });
      }

      if (venta_pago.length) {
        const payloadPagos = venta_pago.map((p: any) => ({
          id_venta,
          id_metodo_pago: p.id_metodo_pago,
          monto: p.monto,
        }));
        await Venta_Pago.bulkCreate(payloadPagos, { transaction: t });
      }

      const debeCrearReceta =
        venta.status_venta === "CONFIRMADA" &&
        recetaPayload &&
        recetaPayload.receta &&
        Array.isArray(recetaPayload.articulos) &&
        recetaPayload.articulos.length > 0;

      if (debeCrearReceta) {
        await RecetaMedicaService.createFromVenta(
          {
            id_venta,
            recetaPayload,
            tempToDetalle: tempMap,
          },
          { transaction: t }
        );
      }

      await venta.reload({ include: ventaIncludes, transaction: t });
      return venta;
    };

    if (options?.transaction) {
      return run(options.transaction);
    }
    return dbLocal.transaction(run);
  },

  update: async (id_venta: string, data: Partial<ICreateOrUpdateVenta>) => {
    const venta = await Venta.findByPk(id_venta);
    if (!venta) return null;
    return venta.update(data);
  },
};
