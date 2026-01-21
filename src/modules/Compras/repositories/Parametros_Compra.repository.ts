import { ICreateOrUpdateParametros_Compra } from "../interface/Parametros_Compra/Parametros_Compra.interface";

import { v4 as uuidv4 } from 'uuid';
import Empresa_Sucursal from "../../../models/Empresa_Sucursal/Empresa_Sucursal";
import Categoria_Articulo from "../../Inventario/Articulos/model/Categoria_Articulo";
import Articulo from "../../Inventario/Articulos/model/Articulo";
import Parametros_Compra from "../model/Parametros_Compra";
import ArticuloExcluidoCompra from "../model/ArticuloExcluidoCompra";
import CategoriaExcluidaCompra from "../model/CategoriaExcluidaCompra";

export const Parametros_CompraRepository = {
    getAll: async () => {
        return await Parametros_Compra.findAll({
            include: [
                {
                    model: CategoriaExcluidaCompra,
                    attributes: ['id_categoria_art'] // solo este campo
                },
                {
                    model: ArticuloExcluidoCompra,
                    attributes: ['id_articulo'] // solo este campo
                },
                {
                    model: Empresa_Sucursal,
                    attributes: ['id_empre', 'nom_empre']
                }

            ]
        });
    },

    getByID: async (id: string) => {
        return await Parametros_Compra.findByPk(id, {
            include:
                [
                    {
                        model: Empresa_Sucursal,
                        attributes: ['id_empre', 'nom_empre']
                    },
                    {

                        model: CategoriaExcluidaCompra,
                        attributes: ['id_categoria_art'],
                        include: [
                            {
                                model: Categoria_Articulo,
                                attributes: ['id_categoria', 'nom_categoria']
                            }
                        ]
                    },
                    {
                        model: ArticuloExcluidoCompra,
                        attributes: ['id_articulo'],
                        include: [
                            {
                                model: Articulo,
                                attributes: ['id_artic', 'des_artic', 'cod_barr_artic']
                            }
                        ]
                    }
                ]
        });
    },
    getByIDEmpresa: async (idEmpresa: string) => {
        const parametro = await Parametros_Compra.findOne({
            where: { id_empresa: idEmpresa }
        })

        const id_parametro_comp = parametro.id_parametro_comp
        return await Parametros_Compra.findByPk(id_parametro_comp, {
            include:
                [
                    {
                        model: Empresa_Sucursal,
                        attributes: ['id_empre', 'nom_empre']
                    },
                    {

                        model: CategoriaExcluidaCompra,
                        attributes: ['id_categoria_art'],
                        include: [
                            {
                                model: Categoria_Articulo,
                                attributes: ['id_categoria', 'nom_categoria']
                            }
                        ]
                    },
                    {
                        model: ArticuloExcluidoCompra,
                        attributes: ['id_articulo'],
                        include: [
                            {
                                model: Articulo,
                                attributes: ['id_artic', 'des_artic', 'cod_barr_artic']
                            }
                        ]
                    }
                ]
        });
    },

    createParametroCompra: async (data: ICreateOrUpdateParametros_Compra) => {
        // 1. Crear Parametro principal
        const parametro = await Parametros_Compra.create({
            id_parametro_comp: uuidv4(),
            id_empresa: data.id_empresa,
            considerar_temporabilidad: data.considerar_temporabilidad,
            ventana_dias: data.ventana_dias,
            dias_a_comprar: data.dias_a_comprar
        });

        // 2. Crear categorías excluidas si existen
        if (data.categoria_excluida?.length) {
            const categorias = data.categoria_excluida.map(cat => ({
                id_categoria_excluida: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_categoria_art: cat.id_categoria_art
            }));
            await CategoriaExcluidaCompra.bulkCreate(categorias);
        }

        // 3. Crear artículos excluidos si existen
        if (data.articulo_excluido?.length) {
            const articulos = data.articulo_excluido.map(art => ({
                id_articulo_excluido: uuidv4(),
                id_parametro_comp: parametro.id_parametro_comp,
                id_articulo: art.id_articulo
            }));
            await ArticuloExcluidoCompra.bulkCreate(articulos);
        }

        return parametro;
    },
    updateParametroCompra: async (id: string, data: ICreateOrUpdateParametros_Compra) => {
        const parametro = await Parametros_Compra.findByPk(id);
        if (!parametro) return null;
        // 1. Actualizar los campos principales
        await parametro.update({
            considerar_temporabilidad: data.considerar_temporabilidad,
            ventana_dias: data.ventana_dias,
            dias_a_comprar: data.dias_a_comprar,
            id_empresa: data.id_empresa,
        });

        // ========== CATEGORÍAS EXCLUIDAS ==========
        const existentesCat = await CategoriaExcluidaCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_categoria_art']
        });

        const actualesCat = existentesCat.map(e => e.id_categoria_art);
        const nuevasCat = data.categoria_excluida?.map(cat => cat.id_categoria_art) || [];

        const aAgregarCat = nuevasCat.filter(id => !actualesCat.includes(id));
        const aEliminarCat = actualesCat.filter(id => !nuevasCat.includes(id));

        // Agregar nuevas categorías
        if (aAgregarCat.length > 0) {
            await CategoriaExcluidaCompra.bulkCreate(
                aAgregarCat.map(idCat => ({
                    id_categoria_excluida: uuidv4(),
                    id_parametro_comp: id,
                    id_categoria_art: idCat
                }))
            );
        }

        // Eliminar las categorías que ya no deben estar
        if (aEliminarCat.length > 0) {
            await CategoriaExcluidaCompra.destroy({
                where: {
                    id_parametro_comp: id,
                    id_categoria_art: aEliminarCat
                }
            });
        }

        // ========== ARTÍCULOS EXCLUIDOS ==========
        const existentesArt = await ArticuloExcluidoCompra.findAll({
            where: { id_parametro_comp: id },
            attributes: ['id_articulo']
        });

        const actualesArt = existentesArt.map(e => e.id_articulo);
        const nuevosArt = data.articulo_excluido?.map(a => a.id_articulo) || [];

        const aAgregarArt = nuevosArt.filter(id => !actualesArt.includes(id));
        const aEliminarArt = actualesArt.filter(id => !nuevosArt.includes(id));

        // Agregar nuevos artículos
        if (aAgregarArt.length > 0) {
            await ArticuloExcluidoCompra.bulkCreate(
                aAgregarArt.map(idArt => ({
                    id_articulo_excluido: uuidv4(),
                    id_parametro_comp: id,
                    id_articulo: idArt
                }))
            );
        }

        // Eliminar los artículos que ya no deben estar
        if (aEliminarArt.length > 0) {
            await ArticuloExcluidoCompra.destroy({
                where: {
                    id_parametro_comp: id,
                    id_articulo: aEliminarArt
                }
            });
        }
        // Forzar update de updatedAt
        await Parametros_Compra.update(
            { updatedAt: new Date() },
            { where: { id } }
        );

        const actualizado = await Parametros_Compra.findByPk(id);
        return actualizado;

    }

}