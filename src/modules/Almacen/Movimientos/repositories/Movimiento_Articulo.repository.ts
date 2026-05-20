import { Op, QueryTypes, WhereOptions } from 'sequelize'
import Movimiento_Articulo from '../model/Movimiento_Articulo'
import Articulo from '../../../Catalogos/Articulos/model/Articulo'
import Empleado from '../../../RRHH/model/Empleado'
import { ICreateMovimientoArticulo, IFiltrosMovimientoArticulo } from '../interface/Movimiento_Articulo.interface'

const TIPOS_ENTRADA = ['AJUSTE_ENTRADA']
const TIPOS_SALIDA = ['SALIDA_MERMA', 'SALIDA_ENTREGA']

export const Movimiento_ArticuloRepository = {

    create: async (data: ICreateMovimientoArticulo) => {
        return await Movimiento_Articulo.create({ ...data })
    },

    findMovimientos: async (filtros: IFiltrosMovimientoArticulo) => {
        const { id_empresa, id_articulo, tipo_movimiento, fecha_inicio, fecha_fin, page = 1, limit = 50 } = filtros

        const where: WhereOptions<any> = {}

        if (id_empresa) where['id_empresa'] = id_empresa
        if (id_articulo) where['id_articulo'] = id_articulo
        if (tipo_movimiento) where['tipo_movimiento'] = tipo_movimiento

        if (fecha_inicio || fecha_fin) {
            where['fecha'] = {
                ...(fecha_inicio ? { [Op.gte]: new Date(fecha_inicio) } : {}),
                ...(fecha_fin ? { [Op.lte]: new Date(fecha_fin + 'T23:59:59') } : {}),
            }
        }

        const offset = (page - 1) * limit

        const { rows, count } = await Movimiento_Articulo.findAndCountAll({
            where,
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_barr_artic'] },
                { model: Empleado, attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'] },
            ],
            order: [['fecha', 'DESC']],
            limit,
            offset,
        })

        return {
            movimientos: rows.map(r => r.get({ plain: true })),
            total: count,
            paginas: Math.ceil(count / limit),
            pagina_actual: page,
        }
    },

    // Calcula existencias actuales por artículo sumando entradas y restando salidas
    getExistencias: async (id_empresa: string, id_articulo?: string) => {
        const sequelize = Movimiento_Articulo.sequelize!

        const artFilter = id_articulo ? 'AND m.id_articulo = :id_articulo' : ''
        const replacements: Record<string, any> = { id_empresa }
        if (id_articulo) replacements.id_articulo = id_articulo

        const rows = await sequelize.query<{
            id_articulo: string
            des_artic: string
            cod_barr_artic: string
            total_entradas: string
            total_salidas: string
            existencia: string
        }>(
            `SELECT
                m.id_articulo,
                a.des_artic,
                a.cod_barr_artic,
                COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'AJUSTE_ENTRADA' THEN m.cantidad ELSE 0 END), 0) AS total_entradas,
                COALESCE(SUM(CASE WHEN m.tipo_movimiento IN ('SALIDA_MERMA','SALIDA_ENTREGA') THEN m.cantidad ELSE 0 END), 0) AS total_salidas,
                COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'AJUSTE_ENTRADA' THEN m.cantidad
                                  WHEN m.tipo_movimiento IN ('SALIDA_MERMA','SALIDA_ENTREGA') THEN -m.cantidad
                                  ELSE 0 END), 0) AS existencia
            FROM movimiento_articulo m
            JOIN articulo a ON a.id_artic = m.id_articulo
            WHERE m.id_empresa = :id_empresa
            ${artFilter}
            GROUP BY m.id_articulo, a.des_artic, a.cod_barr_artic
            ORDER BY a.des_artic`,
            { type: QueryTypes.SELECT, replacements }
        )

        return rows.map(r => ({
            id_articulo: r.id_articulo,
            des_artic: r.des_artic,
            cod_barr_artic: r.cod_barr_artic,
            total_entradas: Number(r.total_entradas),
            total_salidas: Number(r.total_salidas),
            existencia: Number(r.existencia),
        }))
    },
}
