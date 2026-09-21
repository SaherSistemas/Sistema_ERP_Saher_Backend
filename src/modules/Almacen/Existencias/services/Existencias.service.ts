import { Op, QueryTypes, Transaction } from 'sequelize'
import { dbLocal } from '../../../../config/db'
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote'
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal'
import Ubicacion_Sucursal from '../../Ubicaciones/model/Ubicacion_Sucursal'
import { Movimiento_ArticuloRepository } from '../../Movimientos/repositories/Movimiento_Articulo.repository'
import { Movimiento_ArticuloService } from '../../Movimientos/services/Movimiento_Articulo.service'
import Liberacion_Apartada from '../model/Liberacion_Apartada.model'

// Pedidos que de verdad sostienen piezas apartadas: surtidos/chequeados/empacados y aún sin facturar.
// (Empaque deja en EM a pedidos ya facturados y "Vale entregado" es EN, por eso se usa la fecha de facturado.)
const PEDIDO_ACTIVO_SQL = `pa.status_pedido_alm IN ('SU', 'CH', 'EM') AND pa.fecha_facturado_pedido_alm IS NULL`

type UbicacionFila = {
    tipo_ubicacion?: string | null
    tarima_ub?: string | null
    pasillo_ub?: string | null
    anaquel_ub?: string | null
    nivel_ub?: string | null
    posicion_ub?: string | null
}

export function etiquetaUbicacion(u: UbicacionFila | null | undefined): string {
    if (!u) return 'Sin ubicación'
    if (u.tarima_ub) return `Tarima ${String(u.tarima_ub).trim()}`
    const partes = [u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub]
        .map(p => (p == null ? '' : String(p).trim()))
        .filter(Boolean)
    return partes.length ? partes.join('-') : 'Sin ubicación'
}

async function validarUbicacionDeEmpresa(id_ubicacion: string, id_empresa: string, t?: Transaction) {
    const u = await Ubicacion_Sucursal.findOne({
        where: { id_ubicacion_sucursal: id_ubicacion, id_empresa_sucursal: id_empresa, activo: true },
        transaction: t,
    })
    if (!u) throw new Error('La ubicación indicada no existe, no está activa o no es de esta sucursal.')
    return u
}

export const ExistenciasService = {

    // Todas las filas de stock_ubicacion_lote del artículo en la empresa: dónde está y de qué lote.
    getPorArticulo: async (id_empresa: string, id_articulo: string) => {
        const rows = await dbLocal.query<any>(`
            SELECT
                s.id_stock_ubicacion_lote,
                s.id_ubicacion_sucursal,
                s.id_lote,
                s.cantidad,
                COALESCE(s.cantidad_apartada, 0) AS cantidad_apartada,
                l.numero_lote_sucursal,
                l.fecha_venci_lote_sucursal,
                l.precio_costo_lote_sucursal,
                u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub
            FROM stock_ubicacion_lote s
            JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
            LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :id_empresa
              AND s.id_articulo = :id_articulo
            ORDER BY l.fecha_venci_lote_sucursal ASC, l.numero_lote_sucursal ASC,
                     u.pasillo_ub ASC NULLS LAST, NULLIF(regexp_replace(u.anaquel_ub, '[^0-9]', '', 'g'), '')::int NULLS LAST, u.anaquel_ub NULLS LAST,
                     NULLIF(regexp_replace(u.nivel_ub, '[^0-9]', '', 'g'), '')::int NULLS LAST, u.nivel_ub NULLS LAST, NULLIF(regexp_replace(u.posicion_ub, '[^0-9]', '', 'g'), '')::int NULLS LAST, u.posicion_ub NULLS LAST
        `, { replacements: { id_empresa, id_articulo }, type: QueryTypes.SELECT })

        // Pedidos que tienen piezas de cada lote y todavía no descuentan stock (antes de facturar/entregar)
        const pedidosRows = await dbLocal.query<any>(`
            SELECT dpal.id_lote_sucursal AS id_lote,
                   pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.status_pedido_alm,
                   cs.descrip_almacen AS status_desc,
                   ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm,
                   SUM(dpal.cantidad) AS cantidad
            FROM detalle_pedido_almacen_lote dpal
            JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
            JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
            LEFT JOIN cat_status_pedido_almacen cs ON cs.id_status_pedido_almacen = pa.status_pedido_alm
            LEFT JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE dpa.id_articulo = :id_articulo
              AND ${PEDIDO_ACTIVO_SQL}
            GROUP BY dpal.id_lote_sucursal, pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.status_pedido_alm,
                     cs.descrip_almacen, ca.nom_corto_cliente_alm, ca.razon_social_cliente_alm
            ORDER BY pa.cod_int_pedido_alm
        `, { replacements: { id_articulo }, type: QueryTypes.SELECT })

        const pedidosPorLote = new Map<string, any[]>()
        for (const p of pedidosRows) {
            const lista = pedidosPorLote.get(p.id_lote) ?? []
            lista.push({
                cod_pedido: p.cod_int_pedido_alm,
                status: p.status_pedido_alm,
                status_desc: p.status_desc ?? p.status_pedido_alm,
                cliente: String(p.nom_corto_cliente_alm ?? '').trim() || String(p.razon_social_cliente_alm ?? '').trim() || '—',
                cantidad: Number(p.cantidad) || 0,
            })
            pedidosPorLote.set(p.id_lote, lista)
        }

        // Apartada del lote (todas sus ubicaciones) menos lo que respaldan pedidos activos = sin pedido
        const apartadaPorLote = new Map<string, number>()
        for (const r of rows) apartadaPorLote.set(r.id_lote, (apartadaPorLote.get(r.id_lote) ?? 0) + (Number(r.cantidad_apartada) || 0))
        const huerfanaDeLote = (id_lote: string) => {
            const respaldo = (pedidosPorLote.get(id_lote) ?? []).reduce((s, p) => s + p.cantidad, 0)
            return Math.max(0, (apartadaPorLote.get(id_lote) ?? 0) - respaldo)
        }

        const filas = rows.map((r: any) => {
            const cantidad = Number(r.cantidad) || 0
            const apartada = Number(r.cantidad_apartada) || 0
            return {
                apartada_sin_pedido_lote: huerfanaDeLote(r.id_lote),
                pedidos_lote: pedidosPorLote.get(r.id_lote) ?? [],
                id_stock_ubicacion_lote: r.id_stock_ubicacion_lote,
                id_ubicacion_sucursal: r.id_ubicacion_sucursal ?? null,
                ubicacion: r.id_ubicacion_sucursal ? etiquetaUbicacion(r) : 'Sin ubicación',
                id_lote: r.id_lote,
                numero_lote: String(r.numero_lote_sucursal ?? '').trim(),
                fecha_vencimiento: r.fecha_venci_lote_sucursal,
                costo: Number(r.precio_costo_lote_sucursal) || 0,
                cantidad,
                cantidad_apartada: apartada,
                disponible: Math.max(0, cantidad - apartada),
            }
        })

        const totales = filas.reduce((acc, f) => ({
            cantidad: acc.cantidad + f.cantidad,
            apartada: acc.apartada + f.cantidad_apartada,
            disponible: acc.disponible + f.disponible,
        }), { cantidad: 0, apartada: 0, disponible: 0 })

        return { filas, totales }
    },

    // Lotes cuya apartada es mayor a lo que respaldan pedidos activos (de toda la sucursal)
    getApartadasSinPedido: async (id_empresa: string) => {
        const lotes = await dbLocal.query<any>(`
            WITH ap AS (
                SELECT s.id_lote, s.id_articulo, SUM(COALESCE(s.cantidad_apartada, 0)) AS apartada
                FROM stock_ubicacion_lote s
                WHERE s.id_empresa_sucursal = :id_empresa AND COALESCE(s.cantidad_apartada, 0) > 0
                GROUP BY s.id_lote, s.id_articulo
            ), resp AS (
                SELECT dpal.id_lote_sucursal AS id_lote, SUM(dpal.cantidad) AS respaldo
                FROM detalle_pedido_almacen_lote dpal
                JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
                JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
                WHERE ${PEDIDO_ACTIVO_SQL}
                GROUP BY dpal.id_lote_sucursal
            )
            SELECT ap.id_lote, ap.id_articulo, ap.apartada, COALESCE(resp.respaldo, 0) AS respaldo,
                   ap.apartada - COALESCE(resp.respaldo, 0) AS sin_pedido,
                   a.cod_int_artic, a.des_artic, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal
            FROM ap
            LEFT JOIN resp ON resp.id_lote = ap.id_lote
            JOIN articulo a ON a.id_artic = ap.id_articulo
            JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = ap.id_lote
            WHERE ap.apartada - COALESCE(resp.respaldo, 0) > 0
            ORDER BY a.des_artic ASC, l.fecha_venci_lote_sucursal ASC`,
            { replacements: { id_empresa }, type: QueryTypes.SELECT })

        if (!lotes.length) return []

        const ubic = await dbLocal.query<any>(`
            SELECT s.id_lote, s.cantidad_apartada, u.tipo_ubicacion, u.tarima_ub, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub, s.id_ubicacion_sucursal
            FROM stock_ubicacion_lote s
            LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
            WHERE s.id_empresa_sucursal = :id_empresa AND COALESCE(s.cantidad_apartada, 0) > 0
              AND s.id_lote IN (:ids)`,
            { replacements: { id_empresa, ids: lotes.map(l => l.id_lote) }, type: QueryTypes.SELECT })
        const ubicPorLote = new Map<string, string[]>()
        for (const u of ubic) {
            const lista = ubicPorLote.get(u.id_lote) ?? []
            lista.push(`${u.id_ubicacion_sucursal ? etiquetaUbicacion(u) : 'Sin ubicación'} (${Number(u.cantidad_apartada)})`)
            ubicPorLote.set(u.id_lote, lista)
        }

        return lotes.map(l => ({
            id_lote: l.id_lote,
            id_articulo: l.id_articulo,
            cod_int_artic: l.cod_int_artic,
            des_artic: l.des_artic,
            numero_lote: String(l.numero_lote_sucursal ?? '').trim(),
            fecha_vencimiento: l.fecha_venci_lote_sucursal,
            apartada: Number(l.apartada),
            respaldo_pedidos: Number(l.respaldo),
            sin_pedido: Number(l.sin_pedido),
            ubicaciones: ubicPorLote.get(l.id_lote) ?? [],
        }))
    },

    // Libera la apartada SIN pedido de los lotes indicados. Se recalcula dentro de la transacción
    // (nunca se libera lo que un pedido activo sostiene) y queda registrado en liberacion_apartada.
    liberarApartadasSinPedido: async (d: { id_empresa: string; id_empleado: string; id_lotes: string[] }) => {
        const ids = Array.from(new Set((d.id_lotes ?? []).filter(Boolean)))
        if (!ids.length) throw new Error('Elige al menos un lote.')

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            let piezas = 0
            let lotesLiberados = 0
            for (const id_lote of ids) {
                const filas = await Stock_Ubicacion_Lote.findAll({
                    where: { id_empresa_sucursal: d.id_empresa, id_lote },
                    order: [['cantidad_apartada', 'DESC']], transaction: t, lock: t.LOCK.UPDATE,
                })
                const apartada = filas.reduce((s, f) => s + (Number(f.cantidad_apartada) || 0), 0)
                if (apartada <= 0) continue

                const [resp] = await dbLocal.query<any>(`
                    SELECT COALESCE(SUM(dpal.cantidad), 0) AS respaldo
                    FROM detalle_pedido_almacen_lote dpal
                    JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
                    JOIN pedido_almacen pa ON pa.id_pedido_alm = dpa.id_pedido_almacen
                    WHERE dpal.id_lote_sucursal = :id_lote AND ${PEDIDO_ACTIVO_SQL}`,
                    { replacements: { id_lote }, type: QueryTypes.SELECT, transaction: t })
                const respaldo = Number(resp?.respaldo) || 0
                let porLiberar = Math.max(0, apartada - respaldo)
                if (porLiberar <= 0) continue
                const liberar = porLiberar

                for (const f of filas) {
                    if (porLiberar <= 0) break
                    const ap = Number(f.cantidad_apartada) || 0
                    if (ap <= 0) continue
                    const q = Math.min(ap, porLiberar)
                    await f.update({ cantidad_apartada: ap - q }, { transaction: t })
                    porLiberar -= q
                }

                await Liberacion_Apartada.create({
                    id_empresa_sucursal: d.id_empresa,
                    id_articulo: filas[0].id_articulo,
                    id_lote,
                    cantidad_liberada: liberar,
                    apartada_antes: apartada,
                    respaldo_pedidos: respaldo,
                    id_empleado: d.id_empleado || null,
                } as any, { transaction: t })

                piezas += liberar
                lotesLiberados += 1
            }
            await t.commit()
            return { lotes_liberados: lotesLiberados, piezas_liberadas: piezas }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    // Da entrada de mercancía en una ubicación concreta (lote existente o nuevo).
    // Reutiliza el movimiento de almacén: crea/actualiza el lote y queda en el kardex.
    agregar: async (d: {
        id_empresa: string; id_empleado: string; id_articulo: string; cantidad: number
        id_ubicacion_sucursal?: string | null
        id_lote?: string | null; numero_lote?: string; fecha_vencimiento?: string
        costo_unitario?: number | null; notas?: string | null
    }) => {
        const cantidad = Number(d.cantidad)
        if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('La cantidad debe ser un entero mayor a 0.')
        if (!d.notas?.trim()) throw new Error('Captura el motivo del movimiento.')
        if (d.id_ubicacion_sucursal) await validarUbicacionDeEmpresa(d.id_ubicacion_sucursal, d.id_empresa)

        const etiqueta = d.id_ubicacion_sucursal
            ? etiquetaUbicacion(await Ubicacion_Sucursal.findByPk(d.id_ubicacion_sucursal, { raw: true }) as any)
            : 'Sin ubicación'

        return await Movimiento_ArticuloService.registrar({
            id_empresa: d.id_empresa,
            id_articulo: d.id_articulo,
            tipo_movimiento: 'AJUSTE_ENTRADA',
            cantidad,
            notas: `Entrada manual · ${etiqueta}: ${d.notas.trim()}`,
            id_empleado: d.id_empleado,
            id_lote: d.id_lote || null,
            numero_lote: d.numero_lote,
            fecha_vencimiento: d.fecha_vencimiento,
            costo_unitario: d.costo_unitario ?? null,
            id_ubicacion_sucursal: d.id_ubicacion_sucursal || null,
        })
    },

    // Fija la existencia de UNA fila (ubicación + lote) a un valor; la diferencia queda en el kardex.
    ajustarCantidad: async (d: {
        id_empresa: string; id_empleado: string; id_stock_ubicacion_lote: string
        nueva_cantidad: number; notas?: string | null
    }) => {
        const nueva = Number(d.nueva_cantidad)
        if (!Number.isInteger(nueva) || nueva < 0) throw new Error('La cantidad debe ser un entero de 0 o más.')
        if (!d.notas?.trim()) throw new Error('Captura el motivo del ajuste.')

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            const fila = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: d.id_stock_ubicacion_lote, id_empresa_sucursal: d.id_empresa },
                transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!fila) throw new Error('El registro de existencia no existe.')

            const actual = Number(fila.cantidad) || 0
            const apartada = Number(fila.cantidad_apartada) || 0
            if (nueva < apartada) {
                throw new Error(`No puedes dejar menos de lo apartado por pedidos (${apartada} pz) en esta ubicación.`)
            }
            const delta = nueva - actual
            if (delta === 0) throw new Error('La cantidad es la misma; no hay nada que ajustar.')

            const ubicacion = fila.id_ubicacion_sucursal
                ? await Ubicacion_Sucursal.findByPk(fila.id_ubicacion_sucursal, { raw: true, transaction: t })
                : null
            const etiqueta = etiquetaUbicacion(ubicacion as any)

            await fila.update({ cantidad: nueva }, { transaction: t })

            const lote = await Lote_Articulo_Sucursal.findOne({
                where: { id_lote_sucursal: fila.id_lote }, transaction: t, lock: t.LOCK.UPDATE,
            })
            if (lote) {
                await lote.update(
                    { cantidad_entrada_lote: Math.max(0, Number(lote.cantidad_entrada_lote) + delta) },
                    { transaction: t },
                )
            }

            await Movimiento_ArticuloRepository.create({
                id_empresa: d.id_empresa,
                id_articulo: fila.id_articulo,
                tipo_movimiento: delta > 0 ? 'AJUSTE_ENTRADA' : 'SALIDA_MERMA',
                cantidad: Math.abs(delta),
                fecha: new Date(),
                documento_ref: null,
                notas: `Ajuste manual · ${etiqueta}: ${actual} → ${nueva}. ${d.notas.trim()}`,
                id_empleado: d.id_empleado,
                id_lote: fila.id_lote,
            } as any, t)

            await t.commit()
            return { id_stock_ubicacion_lote: fila.id_stock_ubicacion_lote, cantidad_anterior: actual, cantidad_nueva: nueva }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    // Elimina una fila de stock_ubicacion_lote. Si todavía tenía piezas, se registran como salida (merma)
    // en el kardex y se descuentan del lote, igual que un ajuste a 0. No se puede si hay piezas apartadas.
    eliminar: async (d: { id_empresa: string; id_empleado: string; id_stock_ubicacion_lote: string; notas?: string | null }) => {
        if (!d.notas?.trim()) throw new Error('Captura el motivo de la eliminación.')

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            const fila = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: d.id_stock_ubicacion_lote, id_empresa_sucursal: d.id_empresa },
                transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!fila) throw new Error('El registro de existencia no existe.')

            const actual = Number(fila.cantidad) || 0
            const apartada = Number(fila.cantidad_apartada) || 0
            if (apartada > 0) {
                throw new Error(`No se puede eliminar: tiene ${apartada} pz apartadas por pedidos en esta ubicación.`)
            }

            const ubicacion = fila.id_ubicacion_sucursal
                ? await Ubicacion_Sucursal.findByPk(fila.id_ubicacion_sucursal, { raw: true, transaction: t })
                : null
            const etiqueta = etiquetaUbicacion(ubicacion as any)

            if (actual > 0) {
                const lote = await Lote_Articulo_Sucursal.findOne({
                    where: { id_lote_sucursal: fila.id_lote }, transaction: t, lock: t.LOCK.UPDATE,
                })
                if (lote) {
                    await lote.update(
                        { cantidad_entrada_lote: Math.max(0, Number(lote.cantidad_entrada_lote) - actual) },
                        { transaction: t },
                    )
                }
                await Movimiento_ArticuloRepository.create({
                    id_empresa: d.id_empresa,
                    id_articulo: fila.id_articulo,
                    tipo_movimiento: 'SALIDA_MERMA',
                    cantidad: actual,
                    fecha: new Date(),
                    documento_ref: null,
                    notas: `Eliminación manual · ${etiqueta}: ${actual} → 0. ${d.notas.trim()}`,
                    id_empleado: d.id_empleado,
                    id_lote: fila.id_lote,
                } as any, t)
            }

            await fila.destroy({ transaction: t })
            await t.commit()
            return { eliminada: true, piezas_dadas_de_baja: actual }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    // Corrige el lote mismo (número y/o caducidad) en lote_articulo_sucursal. Aplica a TODAS las piezas de ese lote
    // (todas sus ubicaciones y los pedidos que lo usan), porque todas apuntan al mismo registro de lote.
    editarLote: async (d: {
        id_empresa: string; id_lote: string; numero_lote: string; fecha_vencimiento: string
    }) => {
        const numero = (d.numero_lote ?? '').trim()
        if (!numero) throw new Error('Captura el número de lote.')
        if (numero.length > 50) throw new Error('El número de lote es demasiado largo (máx. 50).')
        if (!d.fecha_vencimiento || !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha_vencimiento)) throw new Error('Captura la fecha de caducidad.')
        const fecha = new Date(`${d.fecha_vencimiento}T12:00:00.000Z`)
        if (isNaN(fecha.getTime())) throw new Error('La fecha de caducidad no es válida.')

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            const lote = await Lote_Articulo_Sucursal.findOne({
                where: { id_lote_sucursal: d.id_lote, id_empre: d.id_empresa }, transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!lote) throw new Error('El lote no existe.')

            const repetido = await Lote_Articulo_Sucursal.findOne({
                where: {
                    id_artic: lote.id_artic, id_empre: d.id_empresa, numero_lote_sucursal: numero,
                    id_lote_sucursal: { [Op.ne]: d.id_lote },
                },
                transaction: t,
            })
            if (repetido) {
                throw new Error(`Ya existe otro lote ${numero} de este artículo. Para juntarlos usa el botón "Lote" (mover a otro lote).`)
            }

            const anterior = String(lote.numero_lote_sucursal).trim()
            await lote.update({ numero_lote_sucursal: numero, fecha_venci_lote_sucursal: fecha }, { transaction: t })
            await t.commit()
            return { ok: true, anterior, nuevo: numero }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    // Cambia el lote de TODA la existencia de una fila (ubicación + lote): pasa a otro lote existente o a uno
    // nuevo (número + caducidad), en la misma ubicación. Si ya hay una fila de ese lote ahí, se suman.
    // Sirve para corregir un lote mal capturado. El total del artículo no cambia, por eso no genera kardex.
    cambiarLote: async (d: {
        id_empresa: string; id_stock_ubicacion_lote: string
        id_lote_destino?: string | null; numero_lote?: string | null; fecha_vencimiento?: string | null
    }) => {
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            const origen = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: d.id_stock_ubicacion_lote, id_empresa_sucursal: d.id_empresa },
                transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!origen) throw new Error('El registro de existencia no existe.')

            const cantidad = Number(origen.cantidad) || 0
            const apartada = Number(origen.cantidad_apartada) || 0
            if (cantidad <= 0) throw new Error('Esta fila no tiene existencia que cambiar de lote.')
            if (apartada > 0) {
                throw new Error(`No se puede cambiar el lote: tiene ${apartada} pz apartadas por pedidos. Libéralas o espera a que se facturen.`)
            }

            const loteOrigen = await Lote_Articulo_Sucursal.findOne({
                where: { id_lote_sucursal: origen.id_lote }, transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!loteOrigen) throw new Error('El lote de origen no existe.')

            let loteDestino: Lote_Articulo_Sucursal | null = null
            if (d.id_lote_destino) {
                loteDestino = await Lote_Articulo_Sucursal.findOne({
                    where: { id_lote_sucursal: d.id_lote_destino, id_artic: origen.id_articulo, id_empre: d.id_empresa },
                    transaction: t, lock: t.LOCK.UPDATE,
                })
                if (!loteDestino) throw new Error('El lote elegido no pertenece a este artículo.')
            } else {
                const numero = (d.numero_lote ?? '').trim()
                if (!numero) throw new Error('Elige un lote existente o captura el número del lote nuevo.')
                // El número de lote es único por artículo: si ya existe se usa ese
                loteDestino = await Lote_Articulo_Sucursal.findOne({
                    where: { id_artic: origen.id_articulo, id_empre: d.id_empresa, numero_lote_sucursal: numero },
                    transaction: t, lock: t.LOCK.UPDATE,
                })
                if (!loteDestino) {
                    if (!d.fecha_vencimiento) throw new Error('Captura la fecha de caducidad del lote nuevo.')
                    loteDestino = await Lote_Articulo_Sucursal.create({
                        id_artic: origen.id_articulo,
                        id_empre: d.id_empresa,
                        numero_lote_sucursal: numero,
                        fecha_venci_lote_sucursal: new Date(d.fecha_vencimiento),
                        cantidad_entrada_lote: 0,
                        precio_costo_lote_sucursal: loteOrigen.precio_costo_lote_sucursal,
                        estado_lote_sucursal: 'A',
                    } as any, { transaction: t })
                }
            }
            if (loteDestino.id_lote_sucursal === origen.id_lote) throw new Error('Ese ya es el lote de esta existencia.')

            const existente = await Stock_Ubicacion_Lote.findOne({
                where: {
                    id_empresa_sucursal: d.id_empresa,
                    id_articulo: origen.id_articulo,
                    id_lote: loteDestino.id_lote_sucursal,
                    id_ubicacion_sucursal: (origen.id_ubicacion_sucursal ?? null) as any,
                },
                transaction: t, lock: t.LOCK.UPDATE,
            })
            if (existente) {
                await existente.update({ cantidad: (Number(existente.cantidad) || 0) + cantidad }, { transaction: t })
                await origen.destroy({ transaction: t })
            } else {
                await origen.update({ id_lote: loteDestino.id_lote_sucursal }, { transaction: t })
            }

            await loteOrigen.update(
                { cantidad_entrada_lote: Math.max(0, Number(loteOrigen.cantidad_entrada_lote) - cantidad) },
                { transaction: t },
            )
            await loteDestino.update(
                { cantidad_entrada_lote: (Number(loteDestino.cantidad_entrada_lote) || 0) + cantidad },
                { transaction: t },
            )

            await t.commit()
            return { ok: true, piezas: cantidad, lote: String(loteDestino.numero_lote_sucursal).trim() }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    // Mueve piezas de una ubicación a otra (mismo lote). El total no cambia, por eso no genera kardex.
    mover: async (d: {
        id_empresa: string; id_stock_ubicacion_lote: string
        id_ubicacion_destino: string | null; cantidad: number
    }) => {
        const cantidad = Number(d.cantidad)
        if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('La cantidad debe ser un entero mayor a 0.')
        const destinoId = d.id_ubicacion_destino || null

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            const origen = await Stock_Ubicacion_Lote.findOne({
                where: { id_stock_ubicacion_lote: d.id_stock_ubicacion_lote, id_empresa_sucursal: d.id_empresa },
                transaction: t, lock: t.LOCK.UPDATE,
            })
            if (!origen) throw new Error('El registro de existencia de origen no existe.')

            if ((origen.id_ubicacion_sucursal ?? null) === destinoId) {
                throw new Error('El destino es la misma ubicación de origen.')
            }
            if (destinoId) await validarUbicacionDeEmpresa(destinoId, d.id_empresa, t)

            const cantOrigen = Number(origen.cantidad) || 0
            const disponible = Math.max(0, cantOrigen - (Number(origen.cantidad_apartada) || 0))
            if (cantidad > disponible) {
                throw new Error(`Solo puedes mover lo disponible (${disponible} pz); el resto está apartado por pedidos.`)
            }

            const destino = await Stock_Ubicacion_Lote.findOne({
                where: {
                    id_empresa_sucursal: d.id_empresa,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                    id_ubicacion_sucursal: destinoId as any,
                },
                transaction: t, lock: t.LOCK.UPDATE,
            })

            await origen.update({ cantidad: cantOrigen - cantidad }, { transaction: t })
            if (destino) {
                await destino.update({ cantidad: (Number(destino.cantidad) || 0) + cantidad }, { transaction: t })
            } else {
                await Stock_Ubicacion_Lote.create({
                    id_empresa_sucursal: d.id_empresa,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                    id_ubicacion_sucursal: destinoId,
                    cantidad,
                    cantidad_apartada: 0,
                }, { transaction: t })
            }

            await t.commit()
            return { ok: true, movidas: cantidad }
        } catch (err) {
            await t.rollback()
            throw err
        }
    },
}
