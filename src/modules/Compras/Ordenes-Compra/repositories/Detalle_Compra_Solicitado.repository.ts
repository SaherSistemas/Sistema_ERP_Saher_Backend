import { v4 as uuidv4 } from 'uuid';

import { col, fn, Op, QueryTypes, Sequelize } from 'sequelize';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

import { ICreateOAcumularDetallesSolicitados, ConflictoCapturaError } from '../interface/Detalle_Compra_Solicitado.interface';
import Detalle_Compra_Solicitado from '../model/Detalle_Compra_Solicitado';
import Compra_Proveedor from '../model/Compra_Proveedor';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor';
import Tipo_IVA from '../../../Catalogos/Articulos/model/Tipo_IVA';
import { dbLocal } from '../../../../config/db';


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
      include: [{
        model: Articulo,
        include: [{
          model: Tipo_IVA,
          attributes: ['porcentaje_iva']
        }]
      },
      { model: Compra_Proveedor }
      ]
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
    const rows = await dbLocal.query(`
    SELECT 
      c.id_comp,
      c.estado_comp,
      SUM(d.cantidad_detcompsol) AS total_transito,
      p.nomcort_prove AS proveedor
    FROM detalle_compra_solicitado d
    INNER JOIN compra_proveedor c ON c.id_comp = d.idcompr_detcompsol
    INNER JOIN proveedor p ON p.id_prove = c.idprove_comp
    WHERE d.idarticulo_detcompsol = :id_artic
      AND c.estado_comp IN ('C', 'A', 'E', 'L', 'K')
    GROUP BY c.id_comp, c.estado_comp, p.nomcort_prove
  `, {
      replacements: { id_artic },
      type: QueryTypes.SELECT
    });

    return rows as { id_comp: string; estado_comp: string; total_transito: number; proveedor: string }[];
  },
  addDetallesCompraSolicitado: async (data: ICreateOAcumularDetallesSolicitados) => {
    //console.log("DATAAA", data);
    const detallesProcesados = await Promise.all(
      data.detalles.map(async detalle => {
        // "Corregir": la cantidad capturada ES el total de este artículo con este
        // proveedor, sin importar si el precio de su listado cambió desde la
        // última vez. Se actualiza la línea existente (y su precio) y se descartan
        // duplicados, en vez de crear una segunda línea por diferencia de precio.
        if (data.reemplazar) {
          const lineas = await Detalle_Compra_Solicitado.findAll({
            where: {
              idcompr_detcompsol: data.id_compra,
              idarticulo_detcompsol: detalle.idarticulo_detcompsol,
            },
          });
          // Otra persona pudo cambiar esta línea después de que esta pantalla la cargó
          if (data.cantidad_esperada !== undefined && !data.forzar) {
            const actual = lineas.reduce((s, l) => s + Number(l.cantidad_detcompsol), 0);
            if (actual !== Number(data.cantidad_esperada)) {
              const ultima = [...lineas].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
              throw new ConflictoCapturaError(actual, await Detalle_Compra_SolicitadoRepository.nombreEmpleado(ultima?.id_empleado_captura));
            }
          }
          if (lineas.length > 0) {
            const [principal, ...sobrantes] = lineas;
            principal.cantidad_detcompsol = detalle.cantidad_detcompsol;
            principal.precio_detcompsol = detalle.precio_detcompsol;
            if (data.id_empleado) principal.id_empleado_captura = data.id_empleado;
            await principal.save();
            for (const s of sobrantes) await s.destroy();
            return principal;
          }
        }

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
          if (data.id_empleado) existente.id_empleado_captura = data.id_empleado;
          await existente.save();
          return existente;
        } else {
          return await Detalle_Compra_Solicitado.create({
            id_detcompsol: uuidv4(),
            idcompr_detcompsol: data.id_compra,
            id_empleado_captura: data.id_empleado ?? null,
            ...detalle
          });
        }
      })
    );

    return detallesProcesados;
  },

  nombreEmpleado: async (id_empleado?: string | null): Promise<string | null> => {
    if (!id_empleado) return null;
    const [e]: any[] = await dbLocal.query(
      `SELECT nombre_empleado, ap_pat_empleado FROM empleado WHERE id_empleado = :id`,
      { replacements: { id: id_empleado }, type: QueryTypes.SELECT },
    );
    if (!e) return null;
    return `${String(e.nombre_empleado ?? '').trim().split(/s+/)[0]} ${String(e.ap_pat_empleado ?? '').trim()}`.trim() || null;
  },

  // Todas las líneas de la compra en captura de la empresa, agrupadas por artículo con el mismo
  // formato que usa la lista de productos (proveedoresDetalle / totalSolicitado) + quién las capturó.
  getLineasEnCaptura: async (id_empresa: string) => {
    const rows = await dbLocal.query<any>(`
      SELECT d.id_detcompsol, d.idarticulo_detcompsol, d.cantidad_detcompsol, d.id_empleado_captura,
             cp.idprove_comp, p.nomcort_prove, e.nombre_empleado, e.ap_pat_empleado
      FROM detalle_compra_solicitado d
      JOIN compra_proveedor cp ON cp.id_comp = d.idcompr_detcompsol
      JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
                            AND cg.estado_comp = 'C' AND cg.id_empresa_sucursal = :id_empresa
      LEFT JOIN proveedor p ON p.id_prove = cp.idprove_comp
      LEFT JOIN empleado e ON e.id_empleado = d.id_empleado_captura
      ORDER BY d."createdAt"
    `, { replacements: { id_empresa }, type: QueryTypes.SELECT });

    type Prov = { nombre: string; cantidad: number; id_detcompsol: string; id_prove: string | null; capturista: string | null };
    const cantidadesPorArticulo: Record<string, number> = {};
    const proveedoresPorArticulo: Record<string, Prov[]> = {};

    for (const d of rows) {
      const idArt = d.idarticulo_detcompsol;
      const cantidad = Number(d.cantidad_detcompsol);
      const nombre = d.nomcort_prove ?? 'Desconocido';
      const capturista = d.id_empleado_captura
        ? (`${String(d.nombre_empleado ?? '').trim().split(/s+/)[0]} ${String(d.ap_pat_empleado ?? '').trim()}`.trim() || null)
        : null;
      cantidadesPorArticulo[idArt] = (cantidadesPorArticulo[idArt] ?? 0) + cantidad;
      const lista = (proveedoresPorArticulo[idArt] ??= []);
      const existente = lista.find(p => p.nombre === nombre);
      if (existente) {
        existente.cantidad += cantidad;
        if (capturista) existente.capturista = capturista;
      } else {
        lista.push({ nombre, cantidad, id_detcompsol: d.id_detcompsol, id_prove: d.idprove_comp ?? null, capturista });
      }
    }
    return { cantidadesPorArticulo, proveedoresPorArticulo };
  },

  // Último artículo que guardó este empleado en la compra en captura (para regresarlo ahí al reabrir).
  // Si nadie ha capturado con empleado registrado (compra anterior al cambio) devuelve undefined.
  getUltimoArticuloDeEmpleado: async (id_empresa: string, id_empleado?: string | null) => {
    const filas = await dbLocal.query<any>(`
      SELECT d.idarticulo_detcompsol AS id_artic, d.id_empleado_captura
      FROM detalle_compra_solicitado d
      JOIN compra_proveedor cp ON cp.id_comp = d.idcompr_detcompsol
      JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
                            AND cg.estado_comp = 'C' AND cg.id_empresa_sucursal = :id_empresa
      WHERE d.id_empleado_captura IS NOT NULL
      ORDER BY d."updatedAt" DESC
    `, { replacements: { id_empresa }, type: QueryTypes.SELECT });
    return {
      hayCapturasConEmpleado: filas.length > 0,
      ultimo: id_empleado ? (filas.find((f: any) => f.id_empleado_captura === id_empleado)?.id_artic ?? null) : null,
    };
  },

  deleteDetalleCompra: async (id_detcompsol: string) => {
    const detalle = await Detalle_Compra_Solicitado.findByPk(id_detcompsol);
    if (!detalle) throw new Error('Detalle no encontrado');
    await detalle.destroy();
    return { message: 'Eliminado correctamente' };
  },
};
