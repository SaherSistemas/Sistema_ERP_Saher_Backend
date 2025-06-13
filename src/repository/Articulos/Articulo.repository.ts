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
import ArticuloExcluidoCompra from '../../models/Compra/ArticuloExcluidoCompra';
import CategoriaExcluidaCompra from '../../models/Compra/CategoriaExcluidaCompra';
export const ArticuloRepository = {
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

    getAllPagProductosParaCompra: async (page: number, limit: number, id_parametro_comp: string) => {
        const offset = (page - 1) * limit;

        // 1. Obtener IDs de artículos excluidos
        const articulosExcluidos = await ArticuloExcluidoCompra.findAll({
            where: { id_parametro_comp },
            attributes: ['id_articulo']
        });
        const idsArticulosExcluidos = articulosExcluidos.map(e => e.id_articulo);

        // 2. Obtener IDs de categorías excluidas
        const categoriasExcluidas = await CategoriaExcluidaCompra.findAll({
            where: { id_parametro_comp },
            attributes: ['id_categoria_art']
        });
        const idsCategoriasExcluidas = categoriasExcluidas.map(c => c.id_categoria_art);

        // 3. Traer artículos que NO estén en los excluidos ni en categorías excluidas
        const { count, rows } = await Articulo.findAndCountAll({
            where: {
                id_artic: { [Op.notIn]: idsArticulosExcluidos },
                id_categoria: { [Op.notIn]: idsCategoriasExcluidas }
            },
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