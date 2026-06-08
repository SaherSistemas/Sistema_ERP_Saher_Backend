import { literal, Op, Sequelize, Transaction } from 'sequelize';
import { ICreateOrUpdateArticulo } from "../interface/Articulo.interface";
import Articulo from "../model/Articulo";
import { isUUID } from "../../../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';

import DetalleListaPrecio from '../../../Comercial/Precios/model/Detalle_Lista_Precio';
import ListaPrecio from '../../../Comercial/Precios/model/Lista_Precio';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { Tipo_IVARepository } from './Tipo_IVA.repository';
import Parametros_Compra from '../../../Compras/Ordenes-Compra/model/Parametros_Compra';
import ArticuloExcluidoCompra from '../../../Compras/Ordenes-Compra/model/ArticuloExcluidoCompra';
import CategoriaExcluidaCompra from '../../../Compras/Ordenes-Compra/model/CategoriaExcluidaCompra';
import Compra_General from '../../../Compras/Ordenes-Compra/model/Compra_General';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';
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
    getByCodigoBarras: async (cod_barr_artic: string) => {
        return await Articulo.findOne({ where: { cod_barr_artic } });
    },
    getByPK: async (id_artic: string, options?: { transaction?: Transaction }) => {
        return await Articulo.findByPk(id_artic, {
            transaction: options.transaction
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
    getAllPag: async (page: number, limit: number, query: string) => {
        const offset = (page - 1) * limit;

        const whereClause = query
            ? {
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
            }
            : {};

        const { rows, count } = await Articulo.findAndCountAll({
            where: whereClause,
            offset,
            limit,
            order: [['cod_int_artic', 'ASC']],
        });

        return {
            data: rows,
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

    getAllPagProductosParaCompra: async (page: number, limit: number, id_empresasucursal: string) => {
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

        const { count, rows } = await Articulo.findAndCountAll({
            where: {
                id_artic: { [Op.notIn]: idsArticulosExcluidos },
                id_categoria: { [Op.notIn]: idsCategoriasExcluidas },
                status_artic: true
            },
            order: [['prioridad_artic', 'ASC']],
            offset,
            attributes: ['id_artic', 'cod_int_artic', 'cod_barr_artic', 'des_artic', 'prioridad_artic'],
            limit
        });

        const compraGeneral = await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresasucursal,
                estado_comp: 'C',
            },
        });

        const cantidadesPorArticulo: Record<string, number> = {};
        const proveedoresPorArticulo: Record<string, { nombre: string; cantidad: number, id_detcompsol: string }[]> = {};

        if (compraGeneral) {
            const compras = await Compra_Proveedor.findAll({
                where: { id_compra_general: compraGeneral.id_compra_general },
                attributes: ['id_comp'],
                include: [{ model: Proveedor, attributes: ['nomcort_prove'] }],
                raw: true
            });
            //console.log(compras)
            const idsCompras = compras.map(c => c.id_comp);

            const nombreProveedorPorComp: Record<string, string> = {};
            compras.forEach((cp: any) => {
                nombreProveedorPorComp[cp.id_comp] = cp['proveedor.nomcort_prove'] ?? 'Desconocido';
            });
            //console.log(nombreProveedorPorComp)
            if (idsCompras.length > 0) {
                const detalles = await Detalle_Compra_Solicitado.findAll({
                    where: {
                        idcompr_detcompsol: { [Op.in]: idsCompras }
                    },
                    attributes: [
                        'idarticulo_detcompsol',
                        [Sequelize.fn('SUM', Sequelize.col('cantidad_detcompsol')), 'total']
                    ],
                    group: ['idarticulo_detcompsol'],
                    raw: true
                });

                detalles.forEach((d) => {
                    const idArticulo = d['idarticulo_detcompsol'];
                    const total = Number(d['total'] ?? 0);
                    cantidadesPorArticulo[idArticulo] = total;
                });

                const detallesRaw = await Detalle_Compra_Solicitado.findAll({
                    where: { idcompr_detcompsol: { [Op.in]: idsCompras } },
                    attributes: ['id_detcompsol', 'idarticulo_detcompsol', 'idcompr_detcompsol', 'cantidad_detcompsol'],
                    raw: true
                });

                detallesRaw.forEach((d: any) => {
                    const idArt = d.idarticulo_detcompsol;
                    const nombre = nombreProveedorPorComp[d.idcompr_detcompsol] ?? 'Desconocido';
                    const cantidad = Number(d.cantidad_detcompsol);
                    if (!proveedoresPorArticulo[idArt]) proveedoresPorArticulo[idArt] = [];
                    const existing = proveedoresPorArticulo[idArt].find(p => p.nombre === nombre);
                    if (existing) existing.cantidad += cantidad;
                    else proveedoresPorArticulo[idArt].push({ nombre, cantidad, id_detcompsol: d.id_detcompsol });
                });
            }
        }

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
        console.log(id_empresa_sucursal)
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

        return {
            total: count,
            articulos: rows,
            page,
            totalPages: Math.ceil(count / limit)
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
        const whereArticulo = {
            [Op.or]: [
                { des_artic: { [Op.iLike]: `%${nombre}%` } },
                { cod_barr_artic: { [Op.iLike]: `%${nombre}%` } },
                { des_gener_artic: { [Op.iLike]: `%${nombre}%` } },
            ],
        };

        // 1) Total de artículos que matchean (SIN depender de stock)
        return await Articulo.count({
            where: whereArticulo,
        });
    },
    getPanelPrecios: async (id_artic: string) => {
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

        // ── 3. Lotes activos por empresa ─────────────────────────────────────
        const lotes = await Lote_Articulo_Sucursal.findAll({
            where: {
                id_artic,
                cantidad_entrada_lote: { [Op.gt]: 0 },
            },
            include: [{
                model: Empresa_Sucursal,
                attributes: ['id_empre', 'nom_empre'],
            }],
            attributes: [
                'id_lote_sucursal', 'id_empre', 'numero_lote_sucursal',
                'cantidad_entrada_lote', 'precio_costo_lote_sucursal',
                'estado_lote_sucursal', 'fecha_venci_lote_sucursal',
            ],
            order: [['fecha_venci_lote_sucursal', 'ASC']],
        });

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

        let totalUnidades = 0;
        let sumCostoXCant = 0;
        let sumCantConCosto = 0;

        for (const lote of lotes) {
            const idEmp   = lote.id_empre;
            const nom     = (lote as any).empresa?.nom_empre ?? '—';
            const cant    = lote.cantidad_entrada_lote ?? 0;
            const costo   = Number(lote.precio_costo_lote_sucursal ?? 0);

            if (!empresaMap.has(idEmp)) {
                empresaMap.set(idEmp, { id_empre: idEmp, nom_empre: nom, unidades: 0, costo_total: 0, lotes: [] });
            }
            const emp = empresaMap.get(idEmp)!;
            emp.unidades   += cant;
            emp.costo_total += cant * costo;
            emp.lotes.push({
                id_lote:       lote.id_lote_sucursal,
                numero_lote:   lote.numero_lote_sucursal,
                cantidad:      cant,
                costo_unitario: costo,
                costo_total:   cant * costo,
                estado:        lote.estado_lote_sucursal,
                vencimiento:   lote.fecha_venci_lote_sucursal,
            });

            totalUnidades += cant;
            if (costo > 0) {
                sumCostoXCant   += cant * costo;
                sumCantConCosto += cant;
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
        const whereArticulo = {
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