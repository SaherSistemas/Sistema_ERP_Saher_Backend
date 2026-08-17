import { Margen_Especial_ArticuloRepository } from '../repositories/Margen_Especial_Articulo.repository';

export const Margen_Especial_ArticuloService = {

    getAll: async () => {
        return Margen_Especial_ArticuloRepository.getAll();
    },

    getAllPag: async (page: number, limit: number, q: string, id_lista_precio: string) => {
        return Margen_Especial_ArticuloRepository.getAllPag(page, limit, q, id_lista_precio);
    },

    getByArticulo: async (id_articulo: string) => {
        return Margen_Especial_ArticuloRepository.getByArticulo(id_articulo);
    },

    create: async (data: {
        id_lista_precio: string;
        id_articulo: string;
        margen: number;
        fecha_vencimiento_margen?: string | null;
    }) => {
        const existente = await Margen_Especial_ArticuloRepository.getByListaYArticulo(
            data.id_lista_precio,
            data.id_articulo,
        );
        if (existente) throw new Error('Ya existe un margen especial para este artículo en esa lista de precios');
        return Margen_Especial_ArticuloRepository.create(data);
    },

    update: async (id_margen_especial_articulo: string, data: {
        margen?: number;
        fecha_vencimiento_margen?: string | null;
    }) => {
        return Margen_Especial_ArticuloRepository.update(id_margen_especial_articulo, data);
    },

    delete: async (id_margen_especial_articulo: string) => {
        return Margen_Especial_ArticuloRepository.delete(id_margen_especial_articulo);
    },
};
