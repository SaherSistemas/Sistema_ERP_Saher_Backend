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
export const ArticuloRepository = {
    getAllPag: async (page: number, limit: number) => {
        const offset = (page - 1) * limit;
        const mesActual = new Date().getMonth() + 1;

        const { rows, count } = await Articulo.findAndCountAll({
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
                    attributes: ['id_presentacion', 'nom_presentacion'],

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
            ],
            order: [
                [
                    Sequelize.literal(`
                    CASE
                        WHEN "temporabilidad"."mesinicio_tempo" <= ${mesActual}
                         AND "temporabilidad"."mesfin_tempo" >= ${mesActual}
                        THEN 0
                        WHEN "temporabilidad"."mesinicio_tempo" IS NOT NULL
                         AND "temporabilidad"."mesfin_tempo" IS NOT NULL
                        THEN 1
                        ELSE 2
                    END
                `),
                    'ASC'
                ],
                [Sequelize.literal(`COALESCE("Articulo"."prioridad_artic", 999)`), 'ASC'],
                ['cod_int_artic', 'ASC']
            ]
        });

        return {
            data: rows,
            total: count,
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