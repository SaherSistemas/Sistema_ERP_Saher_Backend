import Imagen_Publicidad from '../model/Imagen_Publicidad';

export const ImagenPublicidadRepository = {
    getByEmpresa: (id_empre: string) =>
        Imagen_Publicidad.findAll({
            where: { id_empre },
            order: [['orden', 'ASC'], ['createdAt', 'ASC']],
        }),

    getByEmpresaActivas: (id_empre: string) =>
        Imagen_Publicidad.findAll({
            where: { id_empre, activa: true },
            order: [['orden', 'ASC'], ['createdAt', 'ASC']],
        }),

    getById: (id_imagen: string) =>
        Imagen_Publicidad.findByPk(id_imagen),

    create: (data: { id_empre: string; titulo?: string; ruta_imagen: string; orden?: number }) =>
        Imagen_Publicidad.create(data as any),

    update: (id_imagen: string, data: Partial<{ titulo: string; orden: number; activa: boolean }>) =>
        Imagen_Publicidad.update(data, { where: { id_imagen } }),

    delete: (id_imagen: string) =>
        Imagen_Publicidad.destroy({ where: { id_imagen } }),

    reordenar: async (ids: string[]) => {
        for (let i = 0; i < ids.length; i++) {
            await Imagen_Publicidad.update({ orden: i }, { where: { id_imagen: ids[i] } });
        }
    },
};
