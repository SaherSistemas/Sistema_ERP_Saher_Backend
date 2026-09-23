import { literal, Op, QueryTypes, Sequelize, Transaction } from 'sequelize';
import { ICreateOrUpdateArticulo } from "../interface/Articulo.interface";
import Articulo from "../model/Articulo";
import { isUUID } from "../../../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';

import DetalleListaPrecio from '../../../Comercial/Precios/model/Detalle_Lista_Precio';
import ListaPrecio from '../../../Comercial/Precios/model/Lista_Precio';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { dbLocal, dbPoly } from '../../../../config/db';
import { Tipo_IVARepository } from './Tipo_IVA.repository';
import Parametros_Compra from '../../../Compras/Ordenes-Compra/model/Parametros_Compra';
import ArticuloExcluidoCompra from '../../../Compras/Ordenes-Compra/model/ArticuloExcluidoCompra';
import CategoriaExcluidaCompra from '../../../Compras/Ordenes-Compra/model/CategoriaExcluidaCompra';
import Compra_General from '../../../Compras/Ordenes-Compra/model/Compra_General';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';
import { Detalle_Compra_SolicitadoRepository } from '../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository';
import Detalle_Compra_Negados from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Negados';
import { LotesArticuloSucursalRepository } from '../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';


export const ArticuloRepository = {

    getAll: async () => {
        return await Articulo.findAll({ attributes: ['id_artic'], raw: true })
    },
    getBycodBarroNombre: async (query: string) => {
        return await Articulo.findAll({
            where: {
                [Op.or]: [
                    { des_artic: { [Op.iLike]: `%${query}%` } },
                    { des_gener_artic: { [Op.iLike]: `%${query}%` } },
                    Sequelize.where(Sequelize.cast(Sequelize.col('cod_barr_artic'), 'TEXT'), {
                        [Op.iLike]: `%${query}%`
                    }),
                    Sequelize.where(Sequelize.cast(Sequelize.col('cod_int_artic'), 'TEXT'), {
                        [Op.iLike]: `%${query}%`
                    })
                ]
            },
            attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic'],
            limit: 20
        });
    },
    // Muchos códigos de barras del catálogo quedaron con espacios de relleno a la derecha
    // (viene de la migración, la columna es varchar(15) pero el dato real trae menos dígitos
    // y se guardó rellenado) — por eso se compara recortando ambos lados, no con igualdad exacta.
    getByCodigoBarras: async (cod_barr_artic: string) => {
        const buscado = String(cod_barr_artic ?? '').trim();
        return await Articulo.findOne({
            where: Sequelize.where(Sequelize.fn('TRIM', Sequelize.col('cod_barr_artic')), buscado),
        });
    },
    getByPK: async (id_artic: string, options?: { transaction?: Transaction }) => {
        return await Articulo.findByPk(id_artic, {
            transaction: options?.transaction
        })
    },
    getIVAPorArticulo: async (id_artic: string, costo: number) => {
        const articulo = await ArticuloRepository.getByIDFlexible(id_artic);

        const tipoIVA = await Tipo_IVARepository.getByID(articulo.tipo_de_iva);
        if (!tipoIVA) throw new Error(`Tipo de IVA no encontrado para artículo ${id_artic}`);

        // Asegúrate de acceder a la propiedad correcta, por ejemplo:
        const porcentaje = Number(tipoIVA.porcentaje_iva) / 100; // o tipoIVA.valor, según tu modelo
        const ivaDelArticulo = costo * porcentaje;

        return ivaDelArticulo;
    },
    getAllPag: async (page: number, limit: number, query: string, id_empresa_sucursal?: string) => {
        const offset = (page - 1) * limit;

        // Divide por espacios para búsqueda multi-palabra (AND de palabras)
        const palabras = query.trim().split(/\s+/).filter(Boolean);

        const whereClause = palabras.length
            ? {
                [Op.and]: palabras.map(p => ({
                    [Op.or]: [
                        { des_artic:      { [Op.iLike]: `%${p}%` } },
                        { des_gener_artic: { [Op.iLike]: `%${p}%` } },
                        Sequelize.where(Sequelize.cast(Sequelize.col('cod_barr_artic'), 'TEXT'), { [Op.iLike]: `%${p}%` }),
                        Sequelize.where(Sequelize.cast(Sequelize.col('cod_int_artic'),  'TEXT'), { [Op.iLike]: `%${p}%` }),
                    ]
                }))
            }
            : {};

        const { rows, count } = await Articulo.findAndCountAll({
            where: whereClause,
            offset,
            limit,
            order: [['cod_int_artic', 'ASC']],
        });

        const idsArticulos = rows.map(r => r.id_artic);
        const existenciaMap = new Map<string, number>();
        if (id_empresa_sucursal && idsArticulos.length) {
            const stockRows = await dbLocal.query<{ id_articulo: string; existencia: string }>(`
                SELECT id_articulo, COALESCE(SUM(cantidad), 0) AS existencia
                FROM stock_ubicacion_lote
                WHERE id_empresa_sucursal = :id_empresa_sucursal
                  AND id_articulo IN (:idsArticulos)
                GROUP BY id_articulo
            `, {
                replacements: { id_empresa_sucursal, idsArticulos },
                type: QueryTypes.SELECT,
            });
            for (const r of stockRows) existenciaMap.set(r.id_articulo, Number(r.existencia));
        }

        const data = rows.map(r => {
            const plain: any = r.toJSON();
            plain.existencia = id_empresa_sucursal ? (existenciaMap.get(r.id_artic) ?? 0) : null;
            return plain;
        });

        return {
            data,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    },

    getAllParaVenta: async (id_empresa: string, cantidad: number, cod_barr_artic: string) => {
        const articulo = await ArticuloRepository.getByIDFlexible(cod_barr_artic);
        if (!articulo) { throw new Error('Artículo no encontrado'); }


        const empresa = await Empresa_SucursalRepository.getByIDLista(id_empresa);
        const Lista_precio_empresa = empresa?.id_listapreciodefault ?? null;
        const lote_articulo = await LotesArticuloSucursalRepository.getLotesPorCodigoBarra(cod_barr_artic, id_empresa);
        const detallePrecio = await DetalleListaPrecio.findOne({
            where: {
                id_artic: articulo.id_artic,
                id_lista_precio: Lista_precio_empresa
            }
        });
        const precio_unitario = detallePrecio?.precios ?? 0;

        return {
            id_artic: articulo.id_artic,
            cod_barr_artic: articulo.cod_barr_artic,
            lote_articulo,
            cantidad,
            descripcion: articulo.des_artic,
            precio_unitario,
            total: precio_unitario * cantidad,
            necesita_receta: articulo.necesita_receta ?? false
        };
    },

    getAllPagProductosParaCompra: async (page: number, limit: number, id_empresasucursal: string, q: string = '') => {
        const offset = (page - 1) * limit;

        const parametro = await Parametros_Compra.findOne({
            where: { id_empresa: id_empresasucursal },
            attributes: ['id_parametro_comp']
        });

        if (!parametro) {
            throw new Error('No se encontraron parámetros de compra configurados.');
        }

        const id_parametro_comp = parametro.id_parametro_comp;

        const articulosExcluidos = await ArticuloExcluidoCompra.findAll({
            where: { id_parametro_comp },
            attributes: ['id_articulo']
        });
        const idsArticulosExcluidos = articulosExcluidos.map(e => e.id_articulo);

        const categoriasExcluidas = await CategoriaExcluidaCompra.findAll({
            where: { id_parametro_comp },
            attributes: ['id_categoria_art']
        });
        const idsCategoriasExcluidas = categoriasExcluidas.map(c => c.id_categoria_art);

        const whereArticulo: any = {
            id_artic: { [Op.notIn]: idsArticulosExcluidos },
            id_categoria: { [Op.notIn]: idsCategoriasExcluidas },
            status_artic: true,
        };
        if (q) {
            const qEscaped = q.replace(/'/g, "''");
            whereArticulo[Op.or] = [
                { des_artic: { [Op.iLike]: `%${q}%` } },
                literal(`"Articulo"."cod_int_artic"::text ILIKE '%${qEscaped}%'`),
                literal(`"Articulo"."cod_barr_artic"::text ILIKE '%${qEscaped}%'`),
            ];
        }

        // Solo artículos que algún proveedor trae en su listado (los que no tienen
        // a quién comprarse no sirven en esta pantalla). Se conservan los que ya
        // tienen pedido en la compra abierta para que no "desaparezcan" si el
        // listado del proveedor se refrescó después de pedirlos.
        const idEmpresaSql = String(id_empresasucursal).replace(/'/g, "''");
        whereArticulo[Op.and] = [
            literal(`(
                trim("Articulo"."cod_barr_artic") IN (
                    SELECT trim(dlp.cod_barra_pro_detlist) FROM detalle_listado_proveedor dlp
                )
                OR "Articulo"."id_artic" IN (
                    SELECT dcs.idarticulo_detcompsol
                    FROM detalle_compra_solicitado dcs
                    JOIN compra_proveedor cp ON cp.id_comp = dcs.idcompr_detcompsol
                    JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
                    WHERE cg.id_empresa_sucursal = '${idEmpresaSql}'
                      AND cg.estado_comp = 'C'
                )
            )`),
        ];

        const { count, rows } = await Articulo.findAndCountAll({
            where: whereArticulo,
            order: [['cod_int_artic', 'ASC']],
            offset,
            attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'des_gener_artic', 'colectivo_artic', 'prioridad_artic'],
            limit
        });

        const compraGeneral = await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresasucursal,
                estado_comp: 'C',
            },
        });

        // Líneas ya capturadas en la compra abierta (con quién las capturó); mismo cálculo que el refresco en vivo
        const { cantidadesPorArticulo, proveedoresPorArticulo } = compraGeneral
            ? await Detalle_Compra_SolicitadoRepository.getLineasEnCaptura(id_empresasucursal)
            : { cantidadesPorArticulo: {} as Record<string, number>, proveedoresPorArticulo: {} as Record<string, any[]> };

        rows.forEach((articulo) => {
            articulo.setDataValue('totalSolicitado', cantidadesPorArticulo[articulo.id_artic] || 0);
            articulo.setDataValue('proveedoresDetalle', proveedoresPorArticulo[articulo.id_artic] || []);
        });
        /* console.log(JSON.stringify(rows.map(r => ({
             articulo: r.des_artic,
             proveedoresDetalle: r.get('proveedoresDetalle')
         })), null, 2));*/
        return {
            total: count,
            articulos: rows,
            page,
            totalPages: Math.ceil(count / limit),
            ultimoGuardado: compraGeneral?.ultimo_articulo_guardado ?? null
        };
    },

    getArticulosNegadosParaCompra: async (id_empresa_sucursal: string, page: number, limit: number) => {
        const offset = (page - 1) * limit;

        // 1. Negados del sistema antiguo (Detalle_Compra_Negados)
        const { count, rows } = await Detalle_Compra_Negados.findAndCountAll({
            where: {
                recuperado: false,
                fecha_limite_recuperacion: { [Op.gte]: new Date() },
            },
            include: [
                {
                    model: Compra_Proveedor,
                    required: false,
                    include: [
                        {
                            model: Compra_General,
                            required: false,
                            where: { id_empresa_sucursal: id_empresa_sucursal },
                        }
                    ]
                },
                {
                    model: Articulo,
                    required: true,
                    attributes: {
                        include: [
                            [Sequelize.literal(`(
                            SELECT COALESCE(SUM(dcs.cantidad_detcompsol), 0)
                            FROM detalle_compra_solicitado dcs
                            INNER JOIN compra_proveedor cp ON cp.id_comp = dcs.idcompr_detcompsol
                            INNER JOIN compra_general cg ON cg.id_compra_general = cp.id_compra_general
                            WHERE dcs.idarticulo_detcompsol = "articulo"."id_artic"
                            AND cg.id_empresa_sucursal = '${id_empresa_sucursal}'
                            AND cg.estado_comp IN ('C', 'F')
                        )`), 'totalSolicitado']
                        ]
                    }
                }
            ],
            offset,
            limit
        });

        // 2. Negados del agente (detalle_pedido_negado motivo=SIN_EXISTENCIA)
        //    agrupados por artículo — query SQL directa para evitar problemas de asociaciones
        const rowsNegadosAgente: any[] = await (Articulo as any).sequelize.query(`
            SELECT
                a.id_artic,
                a.des_artic,
                a.des_gener_artic,
                a.cod_int_artic,
                a.cod_barr_artic,
                a.colectivo_artic,
                SUM(dpn.cantidad_negada)              AS cantidad_negada,
                MIN(dpn.fecha)                        AS fecha_negado,
                MIN(dpn.fecha) + INTERVAL '7 days'   AS fecha_limite_recuperacion
            FROM detalle_pedido_negado dpn
            INNER JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpn.id_detalle_pedido_almacen
            INNER JOIN articulo a ON a.id_artic = dpa.id_articulo
            WHERE dpn.motivo = 'SIN_EXISTENCIA'
              AND dpn.recuperado = false
              AND dpn.fecha + INTERVAL '7 days' >= NOW()
            GROUP BY a.id_artic, a.des_artic, a.des_gener_artic, a.cod_int_artic, a.cod_barr_artic, a.colectivo_artic
        `, { type: QueryTypes.SELECT });

        // Mismo shape que Detalle_Compra_Negados para que TablaProductos lo renderice igual
        const negadosAgenteAgrupados = rowsNegadosAgente.map((r: any) => ({
            articulo: {
                id_artic: r.id_artic,
                des_artic: r.des_artic,
                des_gener_artic: r.des_gener_artic,
                cod_int_artic: r.cod_int_artic,
                cod_barr_artic: r.cod_barr_artic,
                colectivo_artic: r.colectivo_artic ?? null,
                totalSolicitado: 0,
                proveedoresDetalle: [],
            },
            cantidad_negada: Number(r.cantidad_negada),
            fecha_negado: r.fecha_negado,
            fecha_limite_recuperacion: r.fecha_limite_recuperacion,
            motivo_negado: 'Sin existencia',
            _fromAgent: true,
        }));

        return {
            total: count,
            articulos: rows,
            page,
            totalPages: Math.ceil(count / limit),
            negadosAgente: negadosAgenteAgrupados,
        };
    },

    getByIDFlexible: async (id: string) => {
        if (isUUID(id)) {
            return await Articulo.findByPk(id);
        }
        if (!isNaN(Number(id)) && Number.isInteger(Number(id))) {
            const foundByCodInt = await Articulo.findOne({
                where: { cod_int_artic: Number(id) }
            });
            if (foundByCodInt) return foundByCodInt;
        }
        return await Articulo.findOne({
            where: { cod_barr_artic: id }
        });
    },

    ultimoId: async () => {
        return await Articulo.findOne({
            order: [["cod_int_artic", "DESC"]]
        })
    },
    createArticulo: async (data: ICreateOrUpdateArticulo) => {
        const nuevoUUID = uuidv4();
        const UltimoId = await ArticuloRepository.ultimoId();

        const nuevoID = UltimoId ? UltimoId.cod_int_artic + 1 : 1;
        return await Articulo.create({
            id_artic: nuevoUUID,
            cod_int_artic: nuevoID,
            ...data
        })
    },
    updateArticulo: async (id: string, data: ICreateOrUpdateArticulo) => {
        const existe = await ArticuloRepository.getByIDFlexible(id);
        if (!existe) return null;
        return await existe.update(data)
    },
    countBusqueda: async (nombre: string) => {
        const palabras = nombre.trim().split(/\s+/).filter(Boolean);
        const whereArticulo = palabras.length > 1
            ? {
                [Op.and]: palabras.map(p => ({
                    [Op.or]: [
                        { des_artic: { [Op.iLike]: `%${p}%` } },
                        { cod_barr_artic: { [Op.iLike]: `%${p}%` } },
                        { des_gener_artic: { [Op.iLike]: `%${p}%` } },
                    ],
                })),
            }
            : {
                [Op.or]: [
                    { des_artic: { [Op.iLike]: `%${nombre}%` } },
                    { cod_barr_artic: { [Op.iLike]: `%${nombre}%` } },
                    { des_gener_artic: { [Op.iLike]: `%${nombre}%` } },
                ],
            };

        return await Articulo.count({ where: whereArticulo });
    },
    getPanelPrecios: async (id_artic: string, id_empresa?: string) => {
        // ── 1. Artículo ──────────────────────────────────────────────────────
        const articulo = await Articulo.findByPk(id_artic, {
            attributes: [
                'id_artic', 'cod_int_artic', 'cod_barr_artic',
                'des_artic', 'des_gener_artic', 'tipo_de_iva',
                'id_categoria', 'id_presentacion', 'status_artic',
            ],
        });
        if (!articulo) throw new Error('Artículo no encontrado.');

        // ── 2. Todas las listas de precio + precio del artículo en cada una ─
        const todasListas = await ListaPrecio.findAll({
            attributes: ['id_lista_precio', 'nombre_lista_precio', 'cod_int_lista_precio'],
            order: [['cod_int_lista_precio', 'ASC']],
        });

        const detallesArticulo = await DetalleListaPrecio.findAll({
            where: { id_artic },
            attributes: ['id_detalle_lista_precio', 'id_lista_precio', 'precios'],
        });

        const detalleByLista = new Map<string, typeof detallesArticulo[0]>();
        detallesArticulo.forEach(d => detalleByLista.set(d.id_lista_precio, d));

        const listas_precios = todasListas.map(l => ({
            id_lista_precio: l.id_lista_precio,
            nombre_lista_precio: l.nombre_lista_precio,
            cod_int_lista_precio: l.cod_int_lista_precio,
            id_detalle_lista_precio: detalleByLista.get(l.id_lista_precio)?.id_detalle_lista_precio ?? null,
            precio_actual: Number(detalleByLista.get(l.id_lista_precio)?.precios ?? 0),
        }));

        // ── 3. Lotes activos por empresa (solo del grupo) ────────────────────
        const empresasGrupo = id_empresa
            ? await Empresa_SucursalRepository.getEmpresasDelGrupo(id_empresa)
            : [];
        const idsGrupo = empresasGrupo.map((e: any) => e.id_empre);

        // Usa stock_ubicacion_lote como fuente de cantidad real disponible
        const lotesRaw = idsGrupo.length > 0
            ? await dbLocal.query<{
                id_lote_sucursal: string;
                id_empre: string;
                nom_empre: string;
                numero_lote_sucursal: string;
                precio_costo_lote_sucursal: string;
                estado_lote_sucursal: string;
                fecha_venci_lote_sucursal: Date | null;
                cantidad_disponible: string;
              }>(`
                SELECT
                    l.id_lote_sucursal,
                    l.id_empre,
                    es.nom_empre,
                    l.numero_lote_sucursal,
                    l.precio_costo_lote_sucursal,
                    l.estado_lote_sucursal,
                    l.fecha_venci_lote_sucursal,
                    COALESCE(
                        SUM(s.cantidad - COALESCE(s.cantidad_apartada, 0)),
                        0
                    )::numeric AS cantidad_disponible
                FROM lote_articulo_sucursal l
                JOIN empresa_sucursal es ON es.id_empre = l.id_empre
                LEFT JOIN stock_ubicacion_lote s
                    ON s.id_lote = l.id_lote_sucursal
                    AND s.id_empresa_sucursal IN (:idsGrupo)
                WHERE l.id_artic = :id_artic
                  AND l.id_empre IN (:idsGrupo)
                  AND l.cantidad_entrada_lote > 0
                GROUP BY
                    l.id_lote_sucursal, l.id_empre, es.nom_empre,
                    l.numero_lote_sucursal, l.precio_costo_lote_sucursal,
                    l.estado_lote_sucursal, l.fecha_venci_lote_sucursal
                HAVING COALESCE(SUM(s.cantidad - COALESCE(s.cantidad_apartada, 0)), 0) > 0
                ORDER BY l.fecha_venci_lote_sucursal ASC NULLS LAST
              `, {
                type: QueryTypes.SELECT,
                replacements: { id_artic, idsGrupo },
              })
            : [];

        // ── 4. Agrupar por empresa ────────────────────────────────────────────
        const empresaMap = new Map<string, {
            id_empre: string; nom_empre: string;
            unidades: number; costo_total: number;
            lotes: {
                id_lote: string; numero_lote: string;
                cantidad: number; costo_unitario: number;
                costo_total: number; estado: string;
                vencimiento: Date | null;
            }[];
        }>();

        // Pre-inicializar todas las empresas del grupo (aunque no tengan lotes)
        for (const emp of empresasGrupo) {
            empresaMap.set((emp as any).id_empre, {
                id_empre: (emp as any).id_empre,
                nom_empre: (emp as any).nom_empre,
                unidades: 0,
                costo_total: 0,
                lotes: [],
            });
        }

        let totalUnidades = 0;
        let sumCostoXCant = 0;
        let sumCantConCosto = 0;

        for (const lote of lotesRaw) {
            const idEmp   = lote.id_empre;
            const nom     = lote.nom_empre ?? '—';
            const cant    = Number(lote.cantidad_disponible) ?? 0;
            const costo   = Number(lote.precio_costo_lote_sucursal ?? 0);

            if (!empresaMap.has(idEmp)) {
                empresaMap.set(idEmp, { id_empre: idEmp, nom_empre: nom, unidades: 0, costo_total: 0, lotes: [] });
            }
            const emp = empresaMap.get(idEmp)!;
            emp.unidades   += cant;
            emp.costo_total += cant * costo;
            emp.lotes.push({
                id_lote:        lote.id_lote_sucursal,
                numero_lote:    lote.numero_lote_sucursal,
                cantidad:       cant,
                costo_unitario: costo,
                costo_total:    cant * costo,
                estado:         lote.estado_lote_sucursal,
                vencimiento:    lote.fecha_venci_lote_sucursal,
            });

            totalUnidades += cant;
            if (costo > 0) {
                sumCostoXCant   += cant * costo;
                sumCantConCosto += cant;
            }
        }

        // ── 5. Stock PolyDB para sucursales del sistema viejo ────────────────
        const sucursalesPoly = empresasGrupo.filter(
            (e: any) => !e.es_empresa_principal && e.id_empresa_sys_anterior
        );
        const cod_int_artic = (articulo as any).cod_int_artic;
        if (sucursalesPoly.length > 0 && cod_int_artic) {
            const empIds = sucursalesPoly.map((e: any) => Number(e.id_empresa_sys_anterior));
            const rowsPoly = await dbPoly.query<{ empcdempn: number; almexistn: number }>(
                `SELECT empcdempn, COALESCE(almexistn, 0) AS almexistn
                 FROM public.almacenes1
                 WHERE empcdempn IN (:empIds)
                   AND almcdalmn = 1
                   AND artcdartn = :cod_int_artic`,
                {
                    type: QueryTypes.SELECT,
                    replacements: { empIds, cod_int_artic: Number(cod_int_artic) },
                }
            );
            for (const row of rowsPoly) {
                const empresa = sucursalesPoly.find(
                    (e: any) => Number(e.id_empresa_sys_anterior) === row.empcdempn
                );
                if (empresa) {
                    const entry = empresaMap.get((empresa as any).id_empre);
                    if (entry) {
                        entry.unidades = Number(row.almexistn);
                        // Añadir fila sintética para que el frontend muestre el total
                        if (row.almexistn > 0) {
                            entry.lotes.push({
                                id_lote: 'poly',
                                numero_lote: 'Sistema anterior',
                                cantidad: Number(row.almexistn),
                                costo_unitario: 0,
                                costo_total: 0,
                                estado: 'A',
                                vencimiento: null,
                            });
                        }
                    }
                    totalUnidades += Number(row.almexistn);
                }
            }
        }

        const costo_promedio_ponderado = sumCantConCosto > 0
            ? sumCostoXCant / sumCantConCosto
            : 0;

        return {
            articulo: articulo.toJSON(),
            listas_precios,
            costo_promedio_ponderado,
            stock_por_empresa: [...empresaMap.values()],
            existencia_total:       totalUnidades,
            valor_inventario_total: sumCostoXCant,
        };
    },

    getBusquedaPaginadaVenta: async (nombre: string, id_empresa: string, page: number, limit: number) => {
        const palabras = nombre.trim().split(/\s+/).filter(Boolean);
        const whereArticulo = palabras.length > 1
            ? {
                [Op.and]: palabras.map(p => ({
                    [Op.or]: [
                        { des_artic: { [Op.iLike]: `%${p}%` } },
                        { cod_barr_artic: { [Op.iLike]: `%${p}%` } },
                        { des_gener_artic: { [Op.iLike]: `%${p}%` } },
                    ],
                })),
            }
            : {
                [Op.or]: [
                    { des_artic: { [Op.iLike]: `%${nombre}%` } },
                    { cod_barr_artic: { [Op.iLike]: `%${nombre}%` } },
                    { des_gener_artic: { [Op.iLike]: `%${nombre}%` } },
                ],
            };
        const offset = (page - 1) * limit;
        return await Articulo.findAll({
            where: whereArticulo,
            attributes: [
                "id_artic",
                "cod_int_artic",
                "cod_barr_artic",
                "des_artic",
                "des_gener_artic",
                "tipo_de_iva",
                [literal(`COALESCE(SUM("stocks"."cantidad"), 0)`), "existencia_total"],
                [
                    literal(
                        `COALESCE(SUM("stocks"."cantidad" - COALESCE("stocks"."cantidad_apartada", 0)), 0)`
                    ),
                    "existencia_disponible",
                ],
            ],
            include: [
                {
                    model: Stock_Ubicacion_Lote,
                    as: "stocks", // ⚠️ ESTE ALIAS debe existir en tu asociación Articulo.hasMany(Stock_Ubicacion_Lote, { as:'stocks', foreignKey:'id_articulo' })
                    required: false, // ✅ LEFT JOIN
                    attributes: [],
                    where: { id_empresa_sucursal: id_empresa },
                },
            ],
            group: [
                "Articulo.id_artic",
                "Articulo.cod_int_artic",
                "Articulo.cod_barr_artic",
                "Articulo.des_artic",
                "Articulo.des_gener_artic",
                "Articulo.tipo_de_iva",
            ],
            order: [[literal(`"existencia_total"`), "DESC"]],
            limit,
            offset,
            subQuery: false,
            raw: true,
        });
    }
}