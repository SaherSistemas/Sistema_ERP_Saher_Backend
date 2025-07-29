import Margen_Ganancia_Lista from "../../models/Costo_Y_Precio/Margen_Ganancia_Lista";
import { v4 } from "uuid";
import { Op } from "sequelize";
import { IMargen_Ganancia_ListaCreate } from "../../interface/Costo_y_Precio/Marge_Ganancia_Lista.interface";

export const Margen_Ganancia_ListaRepository = {
    getAll: async () => {
        return await Margen_Ganancia_Lista.findAll()
    },
    create: async (data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_Lista.create({
            id_margen: v4(),
            id_lista_precio: data.id_lista_precio,
            id_categoria: data.id_categoria,
            id_presentacion: data.id_presentacion,
            margen: data.margen
        })
    },
    getByProducto: async (id_categoria: string, id_presentacion: string) => {
        return await Margen_Ganancia_Lista.findAll({
            where: {
                id_categoria,
                id_presentacion,
            },
            include: ['lista_precio', 'categoria', 'presentacion'],
        });
    },
    update: async (id_margen: string, data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_Lista.update(data, {
            where: {
                id_margen
            }
        });
    }
}