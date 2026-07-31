import { v4 as uuidv4 } from 'uuid';
import Categoria_Empresa from '../model/Categoria_Empresa';
import Articulo_Categoria_Empresa from '../model/Articulo_Categoria_Empresa';
import Articulo from '../../Catalogos/Articulos/model/Articulo';

export const CategoriaEmpresaRepository = {

    getAll: (id_empre: string) =>
        Categoria_Empresa.findAll({
            where: { id_empre },
            order: [['nom_categoria_empresa', 'ASC']],
        }),

    getById: (id_categoria_empresa: string) =>
        Categoria_Empresa.findByPk(id_categoria_empresa, {
            include: [{
                model: Articulo_Categoria_Empresa,
                include: [{ model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic'] }],
            }],
        }),

    create: (data: { nom_categoria_empresa: string; descripcion?: string; icono?: string; id_empre: string }) =>
        Categoria_Empresa.create({ id_categoria_empresa: uuidv4(), ...data } as any),

    update: async (id_categoria_empresa: string, data: Partial<Categoria_Empresa>) => {
        await Categoria_Empresa.update(data as any, { where: { id_categoria_empresa } });
        return Categoria_Empresa.findByPk(id_categoria_empresa);
    },

    delete: (id_categoria_empresa: string) =>
        Categoria_Empresa.destroy({ where: { id_categoria_empresa } }),

    // ── Asignación de artículos ──────────────────────────────────────────────

    getArticulos: (id_categoria_empresa: string) =>
        Articulo_Categoria_Empresa.findAll({
            where: { id_categoria_empresa },
            include: [{ model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic'] }],
        }),

    asignarArticulo: async (id_categoria_empresa: string, id_artic: string) => {
        const existe = await Articulo_Categoria_Empresa.findOne({ where: { id_categoria_empresa, id_artic } });
        if (existe) return existe;
        return Articulo_Categoria_Empresa.create({
            id_artic_cat_emp: uuidv4(),
            id_categoria_empresa,
            id_artic,
        } as any);
    },

    desasignarArticulo: (id_categoria_empresa: string, id_artic: string) =>
        Articulo_Categoria_Empresa.destroy({ where: { id_categoria_empresa, id_artic } }),

    // Reemplaza todos los artículos de una categoría de golpe
    sincronizarArticulos: async (id_categoria_empresa: string, ids_artic: string[]) => {
        await Articulo_Categoria_Empresa.destroy({ where: { id_categoria_empresa } });
        if (ids_artic.length === 0) return [];
        const rows = ids_artic.map(id_artic => ({
            id_artic_cat_emp: uuidv4(),
            id_categoria_empresa,
            id_artic,
        }));
        return Articulo_Categoria_Empresa.bulkCreate(rows as any);
    },
};
