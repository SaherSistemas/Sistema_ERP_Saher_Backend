import { Op, Sequelize } from 'sequelize';
import { ICreateOrUpdateArticulo } from "../../interface/Articulos/Articulo.interface";
import Articulo from "../../models/Articulos/Articulo";
import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import Temporabilidad from "../../models/Articulos/Temporabilidad";
import Prioridad_Articulo from '../../models/Articulos/Prioridad_Articulo';
import Tipo_Articulo from '../../models/Articulos/Tipo_Articulo';
import Categoria_Articulo from '../../models/Articulos/Categoria_Articulo';
import Presentacion_Articulo from '../../models/Articulos/Presentacion_Articulo';
import UnidadMedida from '../../models/Articulos/UnidadMedida';
import Tipo_IVA from '../../models/Articulos/Tipo_IVA';
import ArticuloExcluidoCompra from '../../models/Compra/Parametros_Compra/ArticuloExcluidoCompra';
import CategoriaExcluidaCompra from '../../models/Compra/Parametros_Compra/CategoriaExcluidaCompra';
import Parametros_Compra from '../../models/Compra/Parametros_Compra/Parametros_Compra';
import Compra_General from '../../models/Compra/Compra_General';
import Compra_Proveedor from '../../models/Compra/Compra_Proveedor';
import Detalle_Compra_Solicitado from '../../models/Compra/Detalle_Compra_Solicitado';
import Detalle_Compra_Negados from '../../models/Compra/Detalle_Compra_Negados';


type DetalleConTotal = {
    id_articulo_detcompsol: string;
    total: number;
};
export const ArticuloRepository = {

    getAll: async () => {
        return await Articulo.findAll({ attributes: ['id_artic'], raw: true })
    },
    getAllPag: async (page: number, limit: number, query: string) => {
        const offset = (page - 1) * limit;

        const whereClause = query
            ? {
                [Op.or]: [
                    { des_artic: { [Op.iLike]: `%${query}%` } },
                    { des_artic: { [Op.iLike]: `%${query}%` } },
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
            include: [
                {
                    model: Temporabilidad,
                    required: false,
                    attributes: ['id_tempo', 'descrip_tempo', 'mesinicio_tempo', 'mesfin_tempo']
                },
                {
                    model: Tipo_IVA,
                    attributes: ['id_iva', 'descripcion_iva']
                },
                {
                    model: UnidadMedida,
                    attributes: ['id_medida', 'descrip_medida']
                },
                {
                    model: Presentacion_Articulo,
                    attributes: ['id_presentacion', 'nom_presentacion']
                },
                {
                    model: Categoria_Articulo,
                    attributes: ['id_categoria', 'nom_categoria'],
                    include: [
                        {
                            model: Tipo_Articulo,
                            attributes: ['id_tipo_art', 'nom_tipo_art']
                        }
                    ]
                },
                {
                    model: Prioridad_Articulo,
                    attributes: ['id_prioridad', 'descrip_prioridad']
                }
            ]
        });

        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
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
            offset,
            limit
        });

        const compraGeneral = await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresasucursal,
                estado_comp: 'C',
            },
        });

        const cantidadesPorArticulo: Record<string, number> = {};

        if (compraGeneral) {
            const compras = await Compra_Proveedor.findAll({
                where: {
                    id_compra_general: compraGeneral.id_compra_general
                },
                attributes: ['id_comp']
            });

            const idsCompras = compras.map(c => c.id_comp);

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
            }
        }

        rows.forEach((articulo) => {
            const total = cantidadesPorArticulo[articulo.id_artic] || 0;
            articulo.setDataValue('totalSolicitado', total);
        });

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

        const { count, rows } = await Detalle_Compra_Negados.findAndCountAll({
            where: {
                recuperado: false,
                fecha_limite_recuperacion: { [Op.gte]: new Date() },
            },
            include: [
                {
                    model: Compra_Proveedor,
                    required: true,
                    include: [
                        {
                            model: Compra_General,
                            required: true,
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
        // Si es un número entero → buscar por código interno
        if (!isNaN(Number(id)) && Number.isInteger(Number(id))) {
            const foundByCodInt = await Articulo.findOne({
                where: { cod_int_artic: Number(id) }
            });
            if (foundByCodInt) return foundByCodInt;
        }
        // Si no es UUID ni número entero → se intenta como código de barras
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
    }
}