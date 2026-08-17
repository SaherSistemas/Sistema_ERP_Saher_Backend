import { literal, Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Margen_Especial_Articulo from '../model/Margen_Especial_Articulo';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Lista_Precio from '../model/Lista_Precio';

export const Margen_Especial_ArticuloRepository = {

    getAll: async () => {
        return Margen_Especial_Articulo.findAll({
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic', 'cod_barr_artic'] },
                { model: Lista_Precio, attributes: ['id_lista_precio', 'nombre_lista_precio', 'cod_int_lista_precio'] },
            ],
            order: [['createdAt', 'DESC']],
        });
    },

    getAllPag: async (page: number, limit: number, q: string = '', id_lista_precio: string = '') => {
        const offset = (page - 1) * limit;

        // Filtro por lista de precio (en el modelo principal)
        const whereMargen: any = {};
        if (id_lista_precio) whereMargen.id_lista_precio = id_lista_precio;

        // Filtro de búsqueda en artículo
        let whereArticulo: any = undefined;
        if (q) {
            const qEsc = q.replace(/'/g, "''");
            whereArticulo = {
                [Op.or]: [
                    { des_artic: { [Op.iLike]: `%${q}%` } },
                    literal(`"articulO"."cod_int_artic"::text ILIKE '%${qEsc}%'`),
                    literal(`"articulO"."cod_barr_artic"::text ILIKE '%${qEsc}%'`),
                ],
            };
        }

        const { count, rows } = await Margen_Especial_Articulo.findAndCountAll({
            where: whereMargen,
            include: [
                {
                    model: Articulo,
                    attributes: ['id_artic', 'des_artic', 'cod_int_artic', 'cod_barr_artic'],
                    where: whereArticulo,
                    required: !!whereArticulo,
                },
                { model: Lista_Precio, attributes: ['id_lista_precio', 'nombre_lista_precio', 'cod_int_lista_precio'] },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        return { total: count, pagina: page, porPagina: limit, data: rows };
    },

    getByArticulo: async (id_articulo: string) => {
        return Margen_Especial_Articulo.findAll({
            where: { id_articulo },
            include: [
                { model: Lista_Precio, attributes: ['id_lista_precio', 'nombre_lista_precio', 'cod_int_lista_precio'] },
            ],
        });
    },

    getByListaYArticulo: async (id_lista_precio: string, id_articulo: string) => {
        return Margen_Especial_Articulo.findOne({
            where: { id_lista_precio, id_articulo },
        });
    },

    getMargenVigenteByListaYArticulo: async (
        id_lista_precio: string,
        id_articulo: string,
        options?: { transaction?: any }
    ): Promise<number | null> => {
        const { Op } = await import('sequelize');
        const registro = await Margen_Especial_Articulo.findOne({
            where: {
                id_lista_precio,
                id_articulo,
                [Op.or]: [
                    { fecha_vencimiento_margen: null },
                    { fecha_vencimiento_margen: { [Op.gte]: new Date() } },
                ],
            },
            transaction: options?.transaction,
        });
        return registro ? Number(registro.margen) : null;
    },

    create: async (data: {
        id_lista_precio: string;
        id_articulo: string;
        margen: number;
        fecha_vencimiento_margen?: string | null;
    }) => {
        return Margen_Especial_Articulo.create({
            id_margen_especial_articulo: uuidv4(),
            id_lista_precio: data.id_lista_precio,
            id_articulo: data.id_articulo,
            margen: data.margen,
            fecha_vencimiento_margen: data.fecha_vencimiento_margen ?? null,
        });
    },

    update: async (id_margen_especial_articulo: string, data: {
        margen?: number;
        fecha_vencimiento_margen?: string | null;
    }) => {
        const [affected] = await Margen_Especial_Articulo.update(data, {
            where: { id_margen_especial_articulo },
        });
        if (!affected) throw new Error('Margen especial no encontrado');
        return Margen_Especial_Articulo.findByPk(id_margen_especial_articulo);
    },

    delete: async (id_margen_especial_articulo: string) => {
        const affected = await Margen_Especial_Articulo.destroy({
            where: { id_margen_especial_articulo },
        });
        if (!affected) throw new Error('Margen especial no encontrado');
    },
};
