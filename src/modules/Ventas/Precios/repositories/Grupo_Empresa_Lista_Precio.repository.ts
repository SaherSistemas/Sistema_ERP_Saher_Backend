import { ICreateOrUpdateGrupo_Empresa_Lista_Precio } from "../interface/Grupo_Empresa_Lista_Precio.interface";
import { v4 } from "uuid";
import { Op } from "sequelize";
import Grupo_Empresa_Lista_Precio from "../model/Grupo_Empresa_Lista_Precio";
import ListaPrecio from "../model/Lista_Precio";

export const Grupo_Empresa_Lista_PrecioRepository = {
    getAll: async () => {
        return await Grupo_Empresa_Lista_Precio.findAll(
            {
                include: [
                    {
                        association: 'lista_precio',
                        attributes: ['nombre_lista_precio']
                    },
                    {
                        association: 'grupo_empresa',
                        attributes: ['nom_grup_empresa']
                    },
                ]
            })
    },

    getListasSinAsignar: async () => {
        const listasAsignadas = await Grupo_Empresa_Lista_Precio.findAll({
            attributes: ['id_list_precio'],
            raw: true
        });

        const idsAsignados = listasAsignadas.map(l => l.id_list_precio);

        if (idsAsignados.length === 0) {
            return await ListaPrecio.findAll({
                attributes: ['id_lista_precio', 'nombre_lista_precio']
            });
        }

        return await ListaPrecio.findAll({
            where: {
                id_lista_precio: {
                    [Op.notIn]: idsAsignados
                }
            },
            attributes: ['id_lista_precio', 'nombre_lista_precio']
        });
    },

    getOne: async (data: ICreateOrUpdateGrupo_Empresa_Lista_Precio) => {
        return await Grupo_Empresa_Lista_Precio.findOne({
            where: {
                id_list_precio: data.id_list_precio
            }
        })
    },

    getByIDGrupo: async (id_grup_empresa: string) => {
        return await Grupo_Empresa_Lista_Precio.findAll({
            where:
            {
                id_grup_empresa
            },
            include: [
                {
                    association: 'lista_precio',
                    attributes: ['nombre_lista_precio']
                },
                {
                    association: 'grupo_empresa',
                    attributes: ['nom_grup_empresa']
                },
            ]
        })
    },
    getSoloListasDePrecioPorIDGrupo: async (id_grup_empresa: string) => {
        return await Grupo_Empresa_Lista_Precio.findAll({
            where:
            {
                id_grup_empresa
            },
            attributes: ['id_list_precio'],
            raw: true
        })
    },
    delete: async (id_grupo_empresa_lista_precio: string) => {
        return await Grupo_Empresa_Lista_Precio.destroy({
            where: { id_grupo_empresa_lista_precio: id_grupo_empresa_lista_precio }
        });
    },
    create: async (data: ICreateOrUpdateGrupo_Empresa_Lista_Precio) => {
        return await Grupo_Empresa_Lista_Precio.create({
            id_grupo_empresa_lista_precio: v4(),
            id_grup_empresa: data.id_grup_empresa,
            id_list_precio: data.id_list_precio
        })
    },
    update: async (id_grupo_empresa_lista_precio: string, data: ICreateOrUpdateGrupo_Empresa_Lista_Precio) => {
        return await Grupo_Empresa_Lista_Precio.update(data, {
            where: {
                id_grupo_empresa_lista_precio
            }
        });
    }
}