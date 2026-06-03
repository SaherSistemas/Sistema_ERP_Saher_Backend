
import { v4 as uuidv4 } from 'uuid';
import { col, fn, literal, Op, QueryTypes, Sequelize, Transaction } from 'sequelize';
import Stock_Ubicacion_Lote from '../model/Stock_Ubicacion_Lote';
import { dbLocal } from '../../../../config/db';
import { CrearStockUbicacionLoteDTO, StockUpsertRow } from '../interface/Stock_Ubicacion_Lote.interface';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import LoteArticuloSucursal from '../../Lotes/model/Lote_Articulo_Sucursal';
import Ubicacion_Sucursal from '../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';

export const Stock_Ubicacion_LoteRepository = {

    getExistencias: async (id_empresa: string, id_articulo?: string) => {
        // 1. Obtener TODAS las empresas (sin filtrar por grupo)
        const empresas = await Empresa_SucursalRepository.getAll()

        const empresaIds = empresas.map((e: any) => e.id_empre);

        // 2. Stock de TODAS las empresas
        const stockGrupo = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: { [Op.in]: empresaIds },
                ...(id_articulo && { id_articulo })
            },
            attributes: [
                'id_empresa_sucursal',
                'id_articulo',
                [fn('COALESCE', fn('SUM', col('cantidad')), 0), 'existencia_total'],
                [fn('COALESCE', fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 0), 'existencia_disponible'],
            ],
            group: ['id_empresa_sucursal', 'id_articulo'],
            raw: true,
        }) as any[];

        // 3. Separar la empresa principal
        const stockPrincipal = stockGrupo.find(
            (s: any) => s.id_empresa_sucursal === id_empresa
        );

        // 4. Totales globales
        const existencia_total_grupo = stockGrupo.reduce(
            (acc: number, s: any) => acc + Number(s.existencia_total), 0
        );
        const existencia_disponible_grupo = stockGrupo.reduce(
            (acc: number, s: any) => acc + Number(s.existencia_disponible), 0
        );

        // 5. Mapear TODAS las empresas (con o sin stock)
        const empresasConStock = empresas.map((empresa: any) => {
            const stock = stockGrupo.find(
                (s: any) => s.id_empresa_sucursal === empresa.id_empre
            );
            return {
                id_empre: empresa.id_empre,
                nombre: empresa.nom_empre,
                existencia_total: Number(stock?.existencia_total ?? 0),
                existencia_disponible: Number(stock?.existencia_disponible ?? 0),
            };
        });

        return {
            existencia_total: Number(stockPrincipal?.existencia_total ?? 0),
            existencia_disponible: Number(stockPrincipal?.existencia_disponible ?? 0),
            existencia_total_grupo,
            existencia_disponible_grupo,
            empresas: empresasConStock,
        };
    },
    findOneByUbicacionYLote: async (id_ubicacion_sucursal: string, id_lote: string, tx?: Transaction) =>
        Stock_Ubicacion_Lote.findOne({
            where: { id_ubicacion_sucursal, id_lote },
            transaction: tx,
            lock: tx ? tx.LOCK.UPDATE : undefined,
        }),

    // Acumula si existe; si no, crea
    bulkUpsertAcumular: async (rows: StockUpsertRow[], tx: Transaction) => {
        if (!rows?.length) return;
        // console.log(rows)
        // Normaliza números
        const payload = rows
            .map(r => ({
                ...r,
                cantidad: Number(r.cantidad ?? 0),
                cantidad_apartada: Number(r.cantidad_apartada ?? 0),
            }))
            .filter(r => r.cantidad !== 0 || r.cantidad_apartada !== 0);

        if (payload.length === 0) return;
        const created = await Stock_Ubicacion_Lote.bulkCreate(payload, {
            transaction: tx,
        });
        return created
    },

    getStockByUbicacion: async (id_ubicacion_sucursal: string) =>
        Stock_Ubicacion_Lote.findAll({
            where: { id_ubicacion_sucursal },
            order: [["createdAt", "DESC"]],
        }),

    // Para regla “estantería solo 1 artículo”: detectar si ya hay stock de otro artículo
    getDistinctArticuloIdsInUbicacion: async (id_ubicacion_sucursal: string, tx?: Transaction) => {
        const rows = await Stock_Ubicacion_Lote.findAll({
            where: { id_ubicacion_sucursal },
            attributes: ["id_articulo"],
            group: ["id_articulo"],
            transaction: tx,
        });
        return rows.map(r => r.id_articulo);
    },
    findPendientesDeAcomodo: async (id_empresa_sucursal: string, cb?: string, tx?: Transaction) => {
        const whereStock: any = {
            id_empresa_sucursal,
            id_ubicacion_sucursal: { [Op.is]: null }, // pendientes
        };

        const includeArticulo: any = {
            model: Articulo,
            attributes: ["id_artic", "cod_barr_artic", "des_artic"],
        };

        if (cb && cb.trim()) {
            includeArticulo.where = {
                cod_barr_artic: { [Op.iLike]: `%${cb.trim()}%` }, // ✅ contiene
            };
            includeArticulo.required = true; // ✅ INNER JOIN cuando hay filtro
        }

        const stock_ubicacion_lote = await Stock_Ubicacion_Lote.findAll({
            where: whereStock,
            transaction: tx,
            attributes: [
                'id_stock_ubicacion_lote',
                'id_lote',
                'cantidad',
                'cantidad_apartada',
                [
                    Sequelize.literal(`"Stock_Ubicacion_Lote"."cantidad" - COALESCE("Stock_Ubicacion_Lote"."cantidad_apartada", 0)`),
                    'cantidad_disponible'
                ]
            ],
            include: [
                includeArticulo,
                {
                    model: LoteArticuloSucursal,
                    attributes: [
                        "id_lote_sucursal",
                        "numero_lote_sucursal",
                        "fecha_venci_lote_sucursal",
                        "cantidad_entrada_lote",
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        return stock_ubicacion_lote;
    },
    getExistenciasPorUbicacion: (
        id_empresa_sucursal: string,
        id_articulo: string,
        idsUbicaciones: string[]
    ) => {
        if (!idsUbicaciones.length) return [];

        return Stock_Ubicacion_Lote.findAll({
            attributes: [
                "id_ubicacion_sucursal",
                [fn("SUM", col("cantidad")), "existencia"],
            ],
            where: {
                id_empresa_sucursal,
                id_articulo,
                id_ubicacion_sucursal: { [Op.in]: idsUbicaciones },
            },
            group: ["id_ubicacion_sucursal"],
            raw: true,
        });
    },
    getExistenciasTotalesPorUbicacion: (
        id_empresa_sucursal: string,
        idsUbicaciones: string[]
    ) => {
        if (!idsUbicaciones.length) return [];

        return Stock_Ubicacion_Lote.findAll({
            attributes: [
                "id_ubicacion_sucursal",
                [fn("SUM", col("cantidad")), "existencia"],
            ],
            where: {
                id_empresa_sucursal,
                id_ubicacion_sucursal: { [Op.in]: idsUbicaciones },
            },
            group: ["id_ubicacion_sucursal"],
            raw: true,
        });
    },


    /*NUEVO */
    findByIdForUpdate: async (
        id_empresa_sucursal: string,
        id_stock_ubicacion_lote: string,
        tx: Transaction
    ) => {
        return Stock_Ubicacion_Lote.findOne({
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
            lock: tx.LOCK.UPDATE,
        });
    },

    updateUbicacionYCantidad: async (
        id_empresa_sucursal: string,
        id_stock_ubicacion_lote: string,
        patch: { id_ubicacion_sucursal: string; cantidad: number },
        tx: Transaction
    ) => {
        await Stock_Ubicacion_Lote.update(patch, {
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
        });

        return Stock_Ubicacion_Lote.findOne({
            where: { id_empresa_sucursal, id_stock_ubicacion_lote },
            transaction: tx,
        });
    },

    create: async (dto: CrearStockUbicacionLoteDTO, tx: Transaction) => {
        if (!dto.id_lote) throw new Error("id_lote requerido");
        return Stock_Ubicacion_Lote.create(
            {
                id_empresa_sucursal: dto.id_empresa_sucursal,
                id_articulo: dto.id_articulo,
                id_lote: dto.id_lote,
                id_ubicacion_sucursal: dto.id_ubicacion_sucursal,
                cantidad: dto.cantidad,
                cantidad_apartada: dto.cantidad_apartada ?? 0,
            },
            { transaction: tx }
        );
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DESCONTAR STOCK AL FACTURAR
    //   Por cada lote registrado en detalle_pedido_almacen_lote del pedido:
    //   · cantidad          -= lo surtido   (nunca baja de 0)
    //   · cantidad_apartada -= lo surtido   (nunca baja de 0)
    // ─────────────────────────────────────────────────────────────────────────
    descontarStockPorPedido: async (id_pedido_alm: string, t: Transaction) => {
        await dbLocal.query(`
            UPDATE stock_ubicacion_lote AS sul
            SET
                cantidad          = GREATEST(0, sul.cantidad          - lp.total),
                cantidad_apartada = GREATEST(0, sul.cantidad_apartada - lp.total)
            FROM (
                SELECT
                    dpal.id_lote_sucursal,
                    SUM(dpal.cantidad) AS total
                FROM detalle_pedido_almacen      dpa
                JOIN detalle_pedido_almacen_lote dpal
                    ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                WHERE dpa.id_pedido_almacen = :id_pedido_alm
                GROUP BY dpal.id_lote_sucursal
            ) AS lp
            WHERE sul.id_lote = lp.id_lote_sucursal
        `, {
            replacements: { id_pedido_alm },
            type: QueryTypes.UPDATE,
            transaction: t,
        });
    },

    getLotesMinimosConUbicaciones: async (
        id_articulo: string,
        id_empresa_sucursal: string,
        cantidad_pedida: number
    ) => {
        const rows = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_articulo,
                id_empresa_sucursal,
                [Op.and]: [
                    literal(`
            "Stock_Ubicacion_Lote"."cantidad"
            - COALESCE("Stock_Ubicacion_Lote"."cantidad_apartada", 0) > 0
          `)
                ]
            },
            attributes: [
                'id_stock_ubicacion_lote',
                'id_articulo',
                'id_ubicacion_sucursal',
                'cantidad',
                'cantidad_apartada',
                [
                    literal(`
            "Stock_Ubicacion_Lote"."cantidad"
            - COALESCE("Stock_Ubicacion_Lote"."cantidad_apartada", 0)
          `),
                    'cantidad_disponible'
                ]
            ],
            include: [
                {
                    model: LoteArticuloSucursal,
                    as: 'lote',
                    required: true,
                    attributes: [
                        'id_lote_sucursal',
                        'numero_lote_sucursal',
                        'fecha_venci_lote_sucursal',
                        'migracion'
                    ]
                },
                {
                    model: Ubicacion_Sucursal,
                    as: 'ubicacion',
                    required: false,
                    attributes: [
                        'id_ubicacion_sucursal',
                        'pasillo_ub',
                        'anaquel_ub',
                        'nivel_ub',
                        'posicion_ub'
                    ]
                }
            ],
            order: [
                [{ model: LoteArticuloSucursal, as: 'lote' }, 'fecha_venci_lote_sucursal', 'ASC'],


                [
                    literal(`
            CASE "ubicacion"."pasillo_ub"
                WHEN 'A1' THEN 1
                WHEN 'A'  THEN 2
                WHEN 'B'  THEN 3
                WHEN 'C'  THEN 4
                WHEN 'D'  THEN 5
                WHEN 'E'  THEN 6
                WHEN 'F'  THEN 7
                WHEN 'G'  THEN 8
                WHEN 'H'  THEN 9
                WHEN 'H1' THEN 10
                ELSE 99
            END
        `),
                    'ASC'
                ],
                [literal(`CAST("ubicacion"."anaquel_ub" AS INTEGER)`), 'ASC'],
                [literal(`CAST("ubicacion"."nivel_ub" AS INTEGER)`), 'ASC'],
                [literal(`CAST("ubicacion"."posicion_ub" AS INTEGER)`), 'ASC'],

                ['id_stock_ubicacion_lote', 'ASC']
            ],
        });
        /* console.log("ROWS DISPONIBLES PARA ARTÍCULO", id_articulo, ":", rows.map(r => ({
             id_stock_ubicacion_lote: r.id_stock_ubicacion_lote,
             cantidad: r.cantidad
 
         })));*/
        if (!rows.length) {
            return {
                id_articulo,
                cantidad_pedida,
                cantidad_total_disponible: 0,
                cantidad_asignada: 0,
                faltante: cantidad_pedida,
                se_completa: false,
                detalles: []
            };
        }

        let restante = Number(cantidad_pedida);
        let cantidad_total_disponible = 0;

        const detalles = [];

        for (const row of rows) {
            const json = row.toJSON() as any;
            const disponible = Number(json.cantidad_disponible || 0);

            cantidad_total_disponible += disponible;

            if (restante <= 0) continue;

            const tomar = Math.min(disponible, restante);
            if (tomar <= 0) continue;

            detalles.push({
                id_stock_ubicacion_lote: json.id_stock_ubicacion_lote,
                id_articulo: json.id_articulo,
                cantidad_disponible: disponible,
                cantidad_a_tomar: tomar,
                stock: {
                    cantidad: Number(json.cantidad || 0),
                    cantidad_apartada: Number(json.cantidad_apartada || 0)
                },
                lote: json.lote
                    ? {
                        id_lote_sucursal: json.lote.id_lote_sucursal,
                        numero_lote_sucursal: json.lote.numero_lote_sucursal,
                        fecha_venci_lote_sucursal: json.lote.fecha_venci_lote_sucursal,
                        migracion: json.lote.migracion
                    }
                    : null,
                ubicacion: json.ubicacion
                    ? {
                        id_ubicacion_sucursal: json.ubicacion.id_ubicacion_sucursal,
                        pasillo: json.ubicacion.pasillo_ub,
                        anaquel: json.ubicacion.anaquel_ub,
                        nivel: json.ubicacion.nivel_ub,
                        posicion: json.ubicacion.posicion_ub
                    }
                    : null
            });

            restante -= tomar;
        }

        const cantidad_asignada = detalles.reduce(
            (acc, item) => acc + Number(item.cantidad_a_tomar || 0),
            0
        );

        return {
            id_articulo,
            cantidad_pedida,
            cantidad_total_disponible,
            cantidad_asignada,
            faltante: Math.max(0, restante),
            se_completa: restante <= 0,
            detalles
        };
    },
};
