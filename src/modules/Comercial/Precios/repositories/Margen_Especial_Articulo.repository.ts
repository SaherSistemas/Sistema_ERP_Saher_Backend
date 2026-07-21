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
