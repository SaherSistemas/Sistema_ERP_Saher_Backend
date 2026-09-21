import { QueryTypes, Transaction } from 'sequelize'
import { dbLocal } from '../../../../config/db'
import { Movimiento_ArticuloRepository } from '../repositories/Movimiento_Articulo.repository'
import { ICreateMovimientoArticulo, IFiltrosMovimientoArticulo } from '../interface/Movimiento_Articulo.interface'
import { LotesArticuloSucursalRepository } from '../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository'
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal'
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote'

// Último costo conocido del artículo en esta empresa (lote más reciente), o 0 si no hay ninguno.
async function getUltimoCostoConocido(id_artic: string, id_empre: string): Promise<number> {
    const ultimo = await Lote_Articulo_Sucursal.findOne({
        where: { id_artic, id_empre },
        order: [['createdAt', 'DESC']],
        attributes: ['precio_costo_lote_sucursal'],
    })
    return ultimo ? Number(ultimo.precio_costo_lote_sucursal) || 0 : 0
}

export const Movimiento_ArticuloService = {

    registrar: async (data: ICreateMovimientoArticulo) => {
        const cantidad = Number(data.cantidad)
        if (!cantidad || cantidad <= 0) throw new Error('La cantidad debe ser mayor a 0.')

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED })
        try {
            let idLoteResultante: string

            if (data.tipo_movimiento === 'AJUSTE_ENTRADA') {
                idLoteResultante = await _darEntrada(data, cantidad, t)
            } else {
                idLoteResultante = await _darSalida(data, cantidad, t)
            }

            const movimiento = await Movimiento_ArticuloRepository.create({
                id_empresa: data.id_empresa,
                id_articulo: data.id_articulo,
                tipo_movimiento: data.tipo_movimiento,
                cantidad,
                fecha: data.fecha ?? new Date(),
                documento_ref: data.documento_ref ?? null,
                notas: data.notas ?? null,
                id_empleado: data.id_empleado,
                id_lote: idLoteResultante,
            } as any, t as any)

            await t.commit()
            return movimiento
        } catch (err) {
            await t.rollback()
            throw err
        }
    },

    obtenerMovimientos: async (filtros: IFiltrosMovimientoArticulo) => {
        return await Movimiento_ArticuloRepository.findMovimientos(filtros)
    },

    obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
        return await Movimiento_ArticuloRepository.getExistencias(id_empresa, id_articulo)
    },

    // Lotes del artículo con su disponible REAL: stock_ubicacion_lote.cantidad - cantidad_apartada
    // (NO usar lote_articulo_sucursal.cantidad_entrada_lote: no descuenta lo apartado por pedidos).
    getLotesConDisponible: async (id_empresa: string, id_articulo: string) => {
        const rows = await dbLocal.query<{
            id_lote_sucursal: string
            numero_lote_sucursal: string
            fecha_venci_lote_sucursal: string
            precio_costo_lote_sucursal: string
            estado_lote_sucursal: string
            disponible: string
        }>(`
            SELECT
                l.id_lote_sucursal,
                l.numero_lote_sucursal,
                l.fecha_venci_lote_sucursal,
                l.precio_costo_lote_sucursal,
                l.estado_lote_sucursal,
                COALESCE(SUM(s.cantidad - COALESCE(s.cantidad_apartada, 0)), 0) AS disponible
            FROM lote_articulo_sucursal l
            LEFT JOIN stock_ubicacion_lote s
                ON s.id_lote = l.id_lote_sucursal
               AND s.id_empresa_sucursal = :id_empresa
            WHERE l.id_artic = :id_articulo AND l.id_empre = :id_empresa
            GROUP BY l.id_lote_sucursal, l.numero_lote_sucursal, l.fecha_venci_lote_sucursal,
                     l.precio_costo_lote_sucursal, l.estado_lote_sucursal
            ORDER BY l.fecha_venci_lote_sucursal ASC
        `, {
            replacements: { id_empresa, id_articulo },
            type: QueryTypes.SELECT,
        })

        return rows.map(r => ({
            id_lote_sucursal: r.id_lote_sucursal,
            numero_lote_sucursal: r.numero_lote_sucursal,
            fecha_venci_lote_sucursal: r.fecha_venci_lote_sucursal,
            precio_costo_lote_sucursal: Number(r.precio_costo_lote_sucursal) || 0,
            estado_lote_sucursal: r.estado_lote_sucursal,
            disponible: Math.max(0, Number(r.disponible) || 0),
        }))
    },
}

// ── Entrada: suma a un lote existente, o da de alta uno nuevo ────────────────
async function _darEntrada(data: ICreateMovimientoArticulo, cantidad: number, t: Transaction): Promise<string> {
    let lote: Lote_Articulo_Sucursal

    if (data.id_lote) {
        const loteExistente = await Lote_Articulo_Sucursal.findOne({
            where: { id_lote_sucursal: data.id_lote, id_artic: data.id_articulo, id_empre: data.id_empresa },
            transaction: t,
        })
        if (!loteExistente) throw new Error('El lote indicado no pertenece a este artículo/empresa.')

        const costoFinal = data.costo_unitario ?? Number(loteExistente.precio_costo_lote_sucursal) ?? 0
        lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal({
            id_artic: data.id_articulo,
            id_empre: data.id_empresa,
            numero_lote_sucursal: loteExistente.numero_lote_sucursal,
            fecha_venci_lote_sucursal: loteExistente.fecha_venci_lote_sucursal,
            cantidad_entrada_lote: cantidad,
            precio_costo_lote_sucursal: costoFinal,
            estado_lote_sucursal: loteExistente.estado_lote_sucursal,
        }, { transaction: t })
    } else {
        if (!data.numero_lote?.trim()) throw new Error('Número de lote requerido para dar de alta un lote nuevo.')
        if (!data.fecha_vencimiento) throw new Error('Fecha de caducidad requerida para dar de alta un lote nuevo.')

        const costoFinal = data.costo_unitario ?? await getUltimoCostoConocido(data.id_articulo, data.id_empresa)
        lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal({
            id_artic: data.id_articulo,
            id_empre: data.id_empresa,
            numero_lote_sucursal: data.numero_lote.trim(),
            fecha_venci_lote_sucursal: new Date(data.fecha_vencimiento),
            cantidad_entrada_lote: cantidad,
            precio_costo_lote_sucursal: costoFinal,
            estado_lote_sucursal: 'A',
        }, { transaction: t })
    }

    // Reflejar en stock_ubicacion_lote: en la ubicación indicada, o sin ubicación si no se manda
    const idUbicacion = data.id_ubicacion_sucursal ?? null
    const stock = await Stock_Ubicacion_Lote.findOne({
        where: {
            id_empresa_sucursal: data.id_empresa,
            id_articulo: data.id_articulo,
            id_lote: lote.id_lote_sucursal,
            id_ubicacion_sucursal: idUbicacion as any,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
    })
    if (stock) {
        await stock.update({ cantidad: Number(stock.cantidad) + cantidad }, { transaction: t })
    } else {
        await Stock_Ubicacion_Lote.create({
            id_empresa_sucursal: data.id_empresa,
            id_articulo: data.id_articulo,
            id_lote: lote.id_lote_sucursal,
            id_ubicacion_sucursal: idUbicacion,
            cantidad,
            cantidad_apartada: 0,
        }, { transaction: t })
    }

    return lote.id_lote_sucursal
}

// ── Salida: descuenta de un lote existente (merma / corrección manual) ──────
async function _darSalida(data: ICreateMovimientoArticulo, cantidad: number, t: Transaction): Promise<string> {
    if (!data.id_lote) throw new Error('Debes indicar de qué lote sale la mercancía.')

    const lote = await Lote_Articulo_Sucursal.findOne({
        where: { id_lote_sucursal: data.id_lote, id_artic: data.id_articulo, id_empre: data.id_empresa },
        transaction: t,
    })
    if (!lote) throw new Error('El lote indicado no pertenece a este artículo/empresa.')

    const filasStock = await Stock_Ubicacion_Lote.findAll({
        where: { id_empresa_sucursal: data.id_empresa, id_articulo: data.id_articulo, id_lote: data.id_lote },
        transaction: t,
        lock: t.LOCK.UPDATE,
    })

    const disponibleTotal = filasStock.reduce(
        (acc, f) => acc + Math.max(0, Number(f.cantidad) - Number(f.cantidad_apartada || 0)),
        0,
    )
    if (disponibleTotal < cantidad) {
        throw new Error(`No hay existencia disponible suficiente en ese lote (disponible: ${disponibleTotal}, solicitado: ${cantidad}).`)
    }

    let restante = cantidad
    for (const fila of filasStock) {
        if (restante <= 0) break
        const disponibleFila = Math.max(0, Number(fila.cantidad) - Number(fila.cantidad_apartada || 0))
        const tomar = Math.min(disponibleFila, restante)
        if (tomar <= 0) continue
        await fila.update({ cantidad: Number(fila.cantidad) - tomar }, { transaction: t })
        restante -= tomar
    }

    const nuevaCantidadLote = Math.max(0, Number(lote.cantidad_entrada_lote) - cantidad)
    await lote.update({ cantidad_entrada_lote: nuevaCantidadLote }, { transaction: t })

    return lote.id_lote_sucursal
}
