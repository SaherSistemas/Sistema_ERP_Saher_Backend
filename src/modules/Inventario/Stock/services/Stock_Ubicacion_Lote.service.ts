
import { QueryTypes, Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../repositories/Stock_Ubicacion_Lote.repository";
import { IAddStockDTO } from "../interface/Stock_Ubicacion_Lote.interface";
import LoteArticuloSucursal from "../../Lotes/model/Lote_Articulo_Sucursal";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";
import { Ubicacion_SucursalRepository } from "../../../Almacen/Ubicaciones/repositories/Ubicacion_Sucursal.repository";
import { Detalle_Compra_SolicitadoRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository";
import Stock_Ubicacion_Lote from "../model/Stock_Ubicacion_Lote";
import Movimiento_Articulo from "../../../Almacen/Movimientos/model/Movimiento_Articulo";


export const Stock_Ubicacion_LoteService = {
    obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
        const enTransito = await Detalle_Compra_SolicitadoRepository.getCantidadTransitoPorArticulo(id_articulo)
        const enRecibo = await Detalle_Compra_SolicitadoRepository.getCantidadEnReciboPorArticulo(id_articulo)
        const existenciasEmpresa = await Stock_Ubicacion_LoteRepository.getExistencias(id_empresa, id_articulo);

        // Piezas COMPROMETIDAS: ya prometidas en pedidos Capturados o Surtiendo que TODAVÍA no se han surtido (lo ya surtido está
        // apartado y ya se resta de la existencia disponible). Están en el almacén pero ya tienen dueño.
        let comprometidoPedidos = 0;
        let pedidosComprometidos: { folio: string; cliente: string; status: string; pedidas: number; surtidas: number; pendiente: number }[] = [];
        if (id_articulo) {
            const filas = await dbLocal.query<any>(`
                SELECT pa.cod_int_pedido_alm AS folio, pa.status_pedido_alm AS status,
                       COALESCE(NULLIF(TRIM(ca.nom_corto_cliente_alm), ''), NULLIF(TRIM(ca.razon_social_cliente_alm), ''), 'Vale de empleado') AS cliente,
                       dpa.cant_pedida AS pedidas,
                       COALESCE(s.surtida, 0) AS surtidas,
                       GREATEST(0, dpa.cant_pedida - COALESCE(s.surtida, 0) - COALESCE(n.negada, 0)) AS pendiente
                FROM detalle_pedido_almacen dpa
                JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
                LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
                LEFT JOIN (SELECT id_detalle_pedido_almacen, SUM(cantidad) AS surtida
                           FROM detalle_pedido_almacen_lote GROUP BY id_detalle_pedido_almacen) s
                       ON s.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                LEFT JOIN (SELECT id_detalle_pedido_almacen, SUM(cantidad_negada) AS negada
                           FROM detalle_pedido_negado GROUP BY id_detalle_pedido_almacen) n
                       ON n.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                WHERE dpa.id_articulo = :id_articulo
                  AND pa.status_pedido_alm IN ('CA', 'SU')
                  AND pa.fecha_facturado_pedido_alm IS NULL
                ORDER BY pa."createdAt" DESC
            `, { replacements: { id_articulo }, type: QueryTypes.SELECT }) as any[];

            pedidosComprometidos = filas
                .map(f => ({
                    folio: String(f.folio ?? ''),
                    cliente: String(f.cliente ?? ''),
                    status: String(f.status ?? ''),
                    pedidas: Number(f.pedidas) || 0,
                    surtidas: Number(f.surtidas) || 0,
                    pendiente: Number(f.pendiente) || 0,
                }))
                .filter(f => f.pendiente > 0);
            comprometidoPedidos = pedidosComprometidos.reduce((s, f) => s + f.pendiente, 0);
        }

        // Piezas APARTADAS (ya surtidas para un pedido que aún no se factura) y qué pedidos las tienen. Si lo apartado es más de
        // lo que los pedidos respaldan, hay apartados "sueltos" (sin pedido) que conviene liberar.
        let apartadaTotal = 0;
        let pedidosConApartadas: { folio: string; cliente: string; status: string; surtidas: number }[] = [];
        if (id_articulo) {
            const idsEmpresa = String(id_empresa ?? '').split(',').map(x => x.trim()).filter(Boolean);
            if (idsEmpresa.length) {
                const [ap] = await dbLocal.query<any>(
                    `SELECT COALESCE(SUM(cantidad_apartada), 0) AS apartada FROM stock_ubicacion_lote
                     WHERE id_articulo = :id_articulo AND id_empresa_sucursal IN (:idsEmpresa)`,
                    { replacements: { id_articulo, idsEmpresa }, type: QueryTypes.SELECT });
                apartadaTotal = Number(ap?.apartada ?? 0);
            }
            const filasAp = await dbLocal.query<any>(`
                SELECT pa.cod_int_pedido_alm AS folio, pa.status_pedido_alm AS status,
                       COALESCE(NULLIF(TRIM(ca.nom_corto_cliente_alm), ''), NULLIF(TRIM(ca.razon_social_cliente_alm), ''), 'Vale de empleado') AS cliente,
                       SUM(l.cantidad) AS surtidas
                FROM detalle_pedido_almacen_lote l
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = l.id_detalle_pedido_almacen
                JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
                LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
                WHERE dpa.id_articulo = :id_articulo
                  AND pa.status_pedido_alm IN ('SU', 'CH', 'EM')
                  AND pa.fecha_facturado_pedido_alm IS NULL
                GROUP BY pa.cod_int_pedido_alm, pa.status_pedido_alm, ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm
                HAVING SUM(l.cantidad) > 0
                ORDER BY MAX(pa."createdAt") DESC
            `, { replacements: { id_articulo }, type: QueryTypes.SELECT }) as any[];
            pedidosConApartadas = filasAp.map(f => ({
                folio: String(f.folio ?? ''), cliente: String(f.cliente ?? ''), status: String(f.status ?? ''), surtidas: Number(f.surtidas) || 0,
            }));
        }

        return {
            existenciasEmpresa, enTransito, enRecibo, comprometidoPedidos,
            pedidosComprometidos: pedidosComprometidos.slice(0, 30),
            apartadaTotal, pedidosConApartadas: pedidosConApartadas.slice(0, 30),
        };
    },
    addStock: async (dto: IAddStockDTO) => {
        if (!dto.id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!dto.id_ubicacion_sucursal) throw new Error("id_ubicacion_sucursal requerido");
        if (!Number.isInteger(dto.cantidad) || dto.cantidad <= 0) throw new Error("cantidad debe ser entero > 0");

        return await dbLocal.transaction(async (tx) => {
            const ubic = await Ubicacion_SucursalRepository.findById(dto.id_ubicacion_sucursal);
            if (!ubic) throw new Error("Ubicación no existe");
            if (ubic.id_empresa_sucursal !== dto.id_empresa_sucursal) throw new Error("Ubicación no pertenece a la sucursal");

            // Resolver lote
            const id_lote = dto.id_lote?.trim();
            if (!id_lote) throw new Error("id_lote requerido");

            const lote = await LoteArticuloSucursal.findByPk(id_lote, { transaction: tx });
            if (!lote) throw new Error("Lote no existe");

            // Resolver artículo (desde lote) y opcional validar por CB
            const id_articulo = (lote as any).id_artic || (lote as any).id_articulo; // ajusta a tu campo real
            if (!id_articulo) throw new Error("El lote no tiene id_articulo asociado");

            if (dto.cod_barr_artic) {
                const art = await Articulo.findOne({
                    where: { cod_barr_artic: dto.cod_barr_artic },
                    transaction: tx,
                });
                if (!art) throw new Error("Código de barras no existe");
                const idArt = (art as any).id_artic || (art as any).id_articulo;
                if (idArt !== id_articulo) throw new Error("El lote no corresponde al artículo del código de barras");
            }

            // Regla: ESTANTERIA solo 1 artículo distinto
            if (ubic.tipo_ubicacion === "ESTANTERIA") {
                const ids = await Stock_Ubicacion_LoteRepository.getDistinctArticuloIdsInUbicacion(ubic.id_ubicacion_sucursal, tx);
                const yaTieneOtro = ids.length > 0 && !ids.includes(id_articulo);
                if (yaTieneOtro) {
                    throw new Error("Esta ubicación de estantería ya tiene otro producto asignado");
                }
            }
            return
            // Acumular stock por (ubicacion, lote)
            /* return await Stock_Ubicacion_LoteRepository.upsertAcumular(
                 {
                     id_ubicacion_sucursal: ubic.id_ubicacion_sucursal,
                     id_articulo,
                     id_lote,
                     cantidad: dto.cantidad,
                     cantidad_apartada: dto.cantidad_apartada,
                 },
                 tx
             );*/
        });
    },

    getStockByUbicacion: async (id_ubicacion_sucursal: string) =>
        Stock_Ubicacion_LoteRepository.getStockByUbicacion(id_ubicacion_sucursal),

    moverStock: async (dto: {
        id_empresa_sucursal: string;
        id_stock_ubicacion_lote: string;
        cantidad: number;
        id_ubicacion_destino: string;
    }) => {
        const { id_empresa_sucursal, id_stock_ubicacion_lote, cantidad, id_ubicacion_destino } = dto;

        if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("cantidad debe ser entero mayor a 0");

        return await dbLocal.transaction(async (tx) => {
            // 1. Traer fila origen con lock
            const origen = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(
                id_empresa_sucursal, id_stock_ubicacion_lote, tx
            );
            if (!origen) throw new Error("Stock origen no encontrado");

            const disponible = origen.cantidad - origen.cantidad_apartada;
            if (cantidad > disponible)
                throw new Error(`Solo hay ${disponible} unidades disponibles (no apartadas) para mover`);

            // 2. Validar destino
            const destino = await Ubicacion_SucursalRepository.findById(id_ubicacion_destino);
            if (!destino) throw new Error("Ubicación destino no existe");
            if (destino.id_empresa_sucursal !== id_empresa_sucursal)
                throw new Error("La ubicación destino no pertenece a esta sucursal");
            if (destino.id_ubicacion_sucursal === origen.id_ubicacion_sucursal)
                throw new Error("El origen y destino son la misma ubicación");

            // 3. Regla: estantería solo 1 artículo distinto
            if (destino.tipo_ubicacion === "ESTANTERIA") {
                const ids = await Stock_Ubicacion_LoteRepository.getDistinctArticuloIdsInUbicacion(
                    destino.id_ubicacion_sucursal, tx
                );
                const yaTieneOtro = ids.length > 0 && !ids.includes(origen.id_articulo);
                if (yaTieneOtro) throw new Error("La ubicación destino ya tiene otro artículo asignado");
            }

            // 4. Descontar origen
            const nuevaCantOrigen = origen.cantidad - cantidad;
            if (nuevaCantOrigen === 0) {
                await origen.destroy({ transaction: tx });
            } else {
                await origen.update({ cantidad: nuevaCantOrigen }, { transaction: tx });
            }

            // 5. Acumular en destino (buscar fila existente para mismo articulo+lote)
            const filaDestino = await Stock_Ubicacion_Lote.findOne({
                where: {
                    id_empresa_sucursal,
                    id_ubicacion_sucursal: id_ubicacion_destino,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });

            if (filaDestino) {
                await filaDestino.update({ cantidad: filaDestino.cantidad + cantidad }, { transaction: tx });
            } else {
                await Stock_Ubicacion_LoteRepository.create({
                    id_empresa_sucursal,
                    id_ubicacion_sucursal: id_ubicacion_destino,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                    cantidad,
                    cantidad_apartada: 0,
                }, tx);
            }

            return { ok: true, movido: cantidad };
        });
    },

    // Ajuste directo de una fila de stock a la cantidad físicamente contada.
    // Corrige stock_ubicacion_lote.cantidad y deja registro en movimiento_articulo (Kardex de ajustes).
    ajustarCantidad: async (dto: {
        id_empresa_sucursal: string;
        id_stock_ubicacion_lote: string;
        cantidad_real: number;
        id_empleado: string;
        notas?: string | null;
    }) => {
        const { id_empresa_sucursal, id_stock_ubicacion_lote, cantidad_real, id_empleado, notas } = dto;

        if (!Number.isInteger(cantidad_real) || cantidad_real < 0)
            throw new Error("La cantidad contada debe ser un entero mayor o igual a 0");

        return await dbLocal.transaction(async (tx) => {
            const fila = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(
                id_empresa_sucursal, id_stock_ubicacion_lote, tx
            );
            if (!fila) throw new Error("Registro de stock no encontrado");

            if (cantidad_real < fila.cantidad_apartada) {
                throw new Error(`No puedes bajar de ${fila.cantidad_apartada} pzas: hay pedidos que ya las tienen apartadas.`);
            }

            const diferencia = cantidad_real - fila.cantidad;
            if (diferencia === 0) {
                return { ok: true, sin_cambios: true, cantidad: fila.cantidad };
            }

            await fila.update({ cantidad: cantidad_real }, { transaction: tx });

            await Movimiento_Articulo.create({
                id_empresa: id_empresa_sucursal,
                id_articulo: fila.id_articulo,
                tipo_movimiento: diferencia > 0 ? 'AJUSTE_ENTRADA' : 'SALIDA_MERMA',
                cantidad: Math.abs(diferencia),
                fecha: new Date(),
                id_lote: fila.id_lote,
                notas: notas?.trim() || 'Ajuste de inventario por conteo físico en ubicación',
                id_empleado,
            } as any, { transaction: tx });

            return {
                ok: true,
                sin_cambios: false,
                cantidad_anterior: fila.cantidad - diferencia,
                cantidad_nueva: cantidad_real,
                diferencia,
            };
        });
    },
};