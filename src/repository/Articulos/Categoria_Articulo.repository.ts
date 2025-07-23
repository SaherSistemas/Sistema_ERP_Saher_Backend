import { ICreateOrUpdateCategoria_Articulo } from '../../interface/Articulos/Categoria_Articulo.interface'
import Categoria_Articulo from '../../models/Articulos/Categoria_Articulo'
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export const Categoria_ArticuloRepository = {
    getAll: async (query?: string) => {
        const whereClause = query
            ? {
                nom_categoria: {
                    [Op.iLike]: `%${query}%`, // busca sin importar mayúsculas/minúsculas
                },
            }
            : {};

        return await Categoria_Articulo.findAll({
            where: whereClause,
        });
    },

    getById: async (id: string) => {
        return await Categoria_Articulo.findByPk(id);
    },
    obtenerPorTipo: async (id: string) => {
        return await Categoria_Articulo.findAll({
            where: {
                id_tipoproducto: id
            }
        });
    },

    createCategoria_Articulo: async (data: ICreateOrUpdateCategoria_Articulo) => {
        const nuevoUUID = uuidv4();

        return await Categoria_Articulo.create({
            id_categoria: nuevoUUID,
            ...data
        })
    },
    updateCategoria_Articulo: async (id: string, data: ICreateOrUpdateCategoria_Articulo) => {
        const existe = await Categoria_ArticuloRepository.getById(id);
        if (!existe) return null;
        return await existe.update(data)
    }
}