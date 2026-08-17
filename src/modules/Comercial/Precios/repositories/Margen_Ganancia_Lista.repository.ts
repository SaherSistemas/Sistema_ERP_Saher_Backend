import Margen_Ganancia_Lista from "../model/Margen_Ganancia_Lista";
import { v4 } from "uuid";
import { Op, Transaction, QueryTypes } from "sequelize";
import { IMargen_Ganancia_ListaCreate } from "../interface/Marge_Ganancia_Lista.interface";
import { dbLocal } from "../../../../config/db";
import Categoria_Articulo from "../../../Catalogos/Articulos/model/Categoria_Articulo";

export const Margen_Ganancia_ListaRepository = {
    getAll: async () => {
        return await Margen_Ganancia_Lista.findAll({
            include: ['lista_precio', 'tipo_art', 'presentacion'],
        })
    },
    create: async (data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_Lista.create({
            id_margen: v4(),
            id_lista_precio: data.id_lista_precio,
            id_tipo_art: data.id_tipo_art,
            id_presentacion: data.id_presentacion,
            margen: data.margen
        })
    },
    // Recibe id_categoria para compatibilidad con los servicios existentes;
    // internamente resuelve el id_tipo_art desde la categoría.
    getByProducto: async (id_categoria: string, id_presentacion: string, options?: { transaction?: Transaction }) => {
        const cat = await Categoria_Articulo.findByPk(id_categoria, {
            attributes: ['id_tipoproducto'],
            transaction: options?.transaction,
        });
        if (!cat?.id_tipoproducto) return [];
        return await Margen_Ganancia_Lista.findAll({
            where: {
                id_tipo_art: cat.id_tipoproducto,
                id_presentacion,
            },
            include: ['lista_precio', 'tipo_art', 'presentacion'],
            transaction: options?.transaction
        });
    },
    update: async (id_margen: string, data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_Lista.update(data, {
            where: {
                id_margen
            }
        });
    },

    getArticulosPendientes: async () => {
        return dbLocal.query<{
            id_artic: string;
            des_artic: string;
            cod_int_artic: string | null;
            nom_categoria: string | null;
            nom_presentacion: string | null;
            problema: 'sin_precio' | 'sin_margen' | 'sin_todo' | 'margen_bajo';
            margen_efectivo: number | null;
            listas: { id: string; nombre: string }[] | null;
        }>(`
            SELECT
                a.id_artic,
                a.des_artic,
                a.cod_int_artic,
                c.nom_categoria,
                p.nom_presentacion,
                -- Listas como JSON array [{id, nombre}] sin duplicados
                (
                    SELECT json_agg(json_build_object('id', lp.id_lista_precio, 'nombre', lp.nombre_lista_precio)
                                    ORDER BY lp.nombre_lista_precio)
                    FROM (
                        SELECT DISTINCT lp2.id_lista_precio, lp2.nombre_lista_precio
                        FROM lista_precio lp2
                        WHERE lp2.id_lista_precio IN (
                            SELECT dlp.id_lista_precio FROM detalle_lista_precio dlp WHERE dlp.id_artic = a.id_artic
                            UNION
                            SELECT mgl.id_lista_precio FROM margen_ganancia_lista mgl
                            WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion
                        )
                    ) lp
                ) AS listas,
                CASE
                    -- Sin precio y sin margen de ningún tipo
                    WHEN NOT EXISTS (
                        SELECT 1 FROM detalle_lista_precio dlp WHERE dlp.id_artic = a.id_artic
                    ) AND NOT EXISTS (
                        SELECT 1 FROM margen_ganancia_lista mgl
                        WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion
                    ) AND NOT EXISTS (
                        SELECT 1 FROM margen_especial_articulo mea WHERE mea.id_articulo = a.id_artic
                    ) THEN 'sin_todo'
                    -- Sin precio (pero puede tener margen)
                    WHEN NOT EXISTS (
                        SELECT 1 FROM detalle_lista_precio dlp WHERE dlp.id_artic = a.id_artic
                    ) THEN 'sin_precio'
                    -- Tiene precio pero sin margen asignado
                    WHEN NOT EXISTS (
                        SELECT 1 FROM margen_ganancia_lista mgl
                        WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion
                    ) AND NOT EXISTS (
                        SELECT 1 FROM margen_especial_articulo mea WHERE mea.id_articulo = a.id_artic
                    ) THEN 'sin_margen'
                    -- Tiene precio y margen, pero el margen efectivo es menor al 10%
                    ELSE 'margen_bajo'
                END AS problema,
                -- Margen efectivo: especial tiene prioridad sobre categoría
                COALESCE(
                    (SELECT mea.margen FROM margen_especial_articulo mea WHERE mea.id_articulo = a.id_artic LIMIT 1),
                    (SELECT mgl.margen FROM margen_ganancia_lista mgl
                     WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion LIMIT 1)
                ) AS margen_efectivo
            FROM articulo a
            LEFT JOIN categoria_articulo c ON c.id_categoria = a.id_categoria
            LEFT JOIN presentacion_articulo p ON p.id_presentacion = a.id_presentacion
            WHERE (
                -- Sin precio
                NOT EXISTS (
                    SELECT 1 FROM detalle_lista_precio dlp WHERE dlp.id_artic = a.id_artic
                )
                -- Sin ningún margen asignado
                OR (
                    NOT EXISTS (
                        SELECT 1 FROM margen_ganancia_lista mgl
                        WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM margen_especial_articulo mea WHERE mea.id_articulo = a.id_artic
                    )
                )
                -- Tiene precio y margen, pero el margen efectivo < 10%
                OR (
                    EXISTS (SELECT 1 FROM detalle_lista_precio dlp WHERE dlp.id_artic = a.id_artic)
                    AND COALESCE(
                        (SELECT mea.margen FROM margen_especial_articulo mea WHERE mea.id_articulo = a.id_artic LIMIT 1),
                        (SELECT mgl.margen FROM margen_ganancia_lista mgl
                         WHERE mgl.id_tipo_art = c.id_tipoproducto AND mgl.id_presentacion = a.id_presentacion LIMIT 1)
                    ) < 10
                )
            )
            ORDER BY problema ASC, a.cod_int_artic ASC NULLS LAST
        `, { type: QueryTypes.SELECT });
    },
}