// src/modules/Inventario/Ubicaciones/repository/Articulo_Ubicacion_Default.repository.ts
import { Transaction, QueryTypes } from "sequelize";
import { dbLocal } from "../../../../../config/db";
import Articulo_Ubicacion_Default from "./model/Articulo_Ubicacion_Default";
import Ubicacion_Sucursal from "../../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal";
import Articulo from "../../model/Articulo";


export const Articulo_Ubicacion_DefaultRepository = {

    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {
        const rows = await Articulo_Ubicacion_Default.findAll({
            attributes: ["id_articulo_ubicacion_default", "id_articulo", "id_empresa_sucursal"],
            where: {
                id_empresa_sucursal,
                id_articulo,
            },
            include: [
                {
                    model: Ubicacion_Sucursal,
                    as: "ubicacion_sucursal", // si tienes alias
                    attributes: ["id_ubicacion_sucursal", "tipo_ubicacion", "tarima_ub", "pasillo_ub", "anaquel_ub", "nivel_ub", "posicion_ub"],
                }
            ]
        });

        return rows.map(r => r.get({ plain: true }));
    },
    // Busca si YA hay un artículo con esta misma ubicación como default (una ubicación
    // solo puede ser default de un artículo a la vez). Antes comparaba contra columnas
    // que no existen en el modelo (id_ubicacion_sucursal en vez de id_ubicacion_default),
    // así que nunca encontraba nada y nunca se usó para bloquear el duplicado.
    // Postgres no permite FOR UPDATE sobre el lado nulable de un LEFT OUTER JOIN, así que
    // el lock se toma solo sobre esta tabla; el artículo (para el mensaje de error) se
    // resuelve aparte, sin lock, solo si hace falta.
    findByUbicacion: async (id_empresa_sucursal: string, id_ubicacion_default: string, t?: Transaction) => {
        const fila = await Articulo_Ubicacion_Default.findOne({
            where: { id_empresa_sucursal, id_ubicacion_default },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
        });
        if (!fila) return fila;

        const articulo = await Articulo.findByPk(fila.id_articulo, {
            attributes: ["id_artic", "des_artic", "cod_int_artic"],
            transaction: t,
        });
        (fila as any).articulo = articulo;
        return fila;
    },

    // Una TARIMA sí puede tener físicamente varios artículos encima; el bloqueo de
    // "una ubicación = un solo artículo default" solo aplica a anaqueles/estantería.
    getTipoUbicacion: async (id_ubicacion_sucursal: string, t?: Transaction) => {
        const ubicacion = await Ubicacion_Sucursal.findByPk(id_ubicacion_sucursal, { transaction: t });
        return ubicacion?.tipo_ubicacion ?? null;
    },

    // Todas las filas default que ya tiene este artículo (debería ser a lo más 1; si hay
    // más de una son residuo de antes de que actualizarOCrear hiciera un update real).
    findAllByArticulo: async (id_empresa_sucursal: string, id_articulo: string, t?: Transaction) => {
        return await Articulo_Ubicacion_Default.findAll({
            where: { id_empresa_sucursal, id_articulo },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
        });
    },

    moverAUbicacion: async (id_articulo_ubicacion_default: string, id_ubicacion_default: string, t?: Transaction) => {
        await Articulo_Ubicacion_Default.update(
            { id_ubicacion_default },
            { where: { id_articulo_ubicacion_default }, transaction: t }
        );
        return await Articulo_Ubicacion_Default.findByPk(id_articulo_ubicacion_default, { transaction: t });
    },

    create: async (
        data: { id_empresa_sucursal: string; id_articulo: string; id_ubicacion_default: string },
        t?: Transaction
    ) => {
        //console.log(data)
        return await Articulo_Ubicacion_Default.create(data as any, { transaction: t });
    },

    eliminar: async (id_articulo_ubicacion_default: string, t?: Transaction) => {
        return await Articulo_Ubicacion_Default.destroy({ where: { id_articulo_ubicacion_default }, transaction: t });
    },

    updateUbicacion: async (id_ubicacion_articulo: string, id_ubicacion_sucursal: string, t?: Transaction) => {
        await Articulo_Ubicacion_Default.update(
            { id_ubicacion_sucursal },
            { where: { id_ubicacion_articulo }, transaction: t }
        );
        return await Articulo_Ubicacion_Default.findByPk(id_ubicacion_articulo, { transaction: t });
    },

    // Ubicaciones que hoy son default de más de un artículo (no deberían existir tras el
    // bloqueo en actualizarOCrearDefaultArticulOUbicacion, pero quedaron de antes de esa validación).
    // Las TARIMA se excluyen: ahí sí es normal y permitido que varios artículos compartan
    // la misma tarima como default (una tarima física guarda varios productos).
    getConflictos: async (id_empresa_sucursal: string) => {
        return await dbLocal.query<{
            id_ubicacion_default: string;
            tipo_ubicacion: string;
            tarima_ub: string | null;
            pasillo_ub: string | null;
            anaquel_ub: string | null;
            nivel_ub: string | null;
            posicion_ub: string | null;
            id_articulo: string;
            id_articulo_ubicacion_default: string;
            cod_int_artic: number;
            des_artic: string;
        }>(
            `
            SELECT
                aud.id_ubicacion_default,
                us.tipo_ubicacion,
                us.tarima_ub,
                us.pasillo_ub,
                us.anaquel_ub,
                us.nivel_ub,
                us.posicion_ub,
                aud.id_articulo,
                aud.id_articulo_ubicacion_default,
                a.cod_int_artic,
                a.des_artic
            FROM articulo_ubicacion_default aud
            JOIN ubicacion_sucursal us ON us.id_ubicacion_sucursal = aud.id_ubicacion_default
            JOIN articulo a ON a.id_artic = aud.id_articulo
            WHERE aud.id_empresa_sucursal = :id_empresa_sucursal
              AND us.tipo_ubicacion <> 'TARIMA'
              AND aud.id_ubicacion_default IN (
                  SELECT aud2.id_ubicacion_default
                  FROM articulo_ubicacion_default aud2
                  JOIN ubicacion_sucursal us2 ON us2.id_ubicacion_sucursal = aud2.id_ubicacion_default
                  WHERE aud2.id_empresa_sucursal = :id_empresa_sucursal
                    AND us2.tipo_ubicacion <> 'TARIMA'
                  GROUP BY aud2.id_ubicacion_default
                  HAVING COUNT(DISTINCT aud2.id_articulo) > 1
              )
            ORDER BY us.pasillo_ub, us.tarima_ub, us.anaquel_ub, us.nivel_ub, us.posicion_ub, a.cod_int_artic;
            `,
            { replacements: { id_empresa_sucursal }, type: QueryTypes.SELECT }
        );
    },

    // Artículos con MÁS de 1 ubicación de anaquel/estantería como default (el máximo permitido
    // es 1 anaquel + 1 tarima). No debería pasar tras el bloqueo de actualizarOCrearDefaultArticulOUbicacion,
    // pero puede quedar de datos viejos o de una edición directa en BD. Se trae también su tarima
    // (si tiene) para ver el cuadro completo del artículo, aunque esa no cuente como exceso.
    getArticulosConExcesoUbicaciones: async (id_empresa_sucursal: string) => {
        return await dbLocal.query<{
            id_articulo: string;
            cod_int_artic: number;
            des_artic: string;
            id_articulo_ubicacion_default: string;
            id_ubicacion_sucursal: string;
            tipo_ubicacion: string;
            tarima_ub: string | null;
            pasillo_ub: string | null;
            anaquel_ub: string | null;
            nivel_ub: string | null;
            posicion_ub: string | null;
        }>(
            `
            SELECT
                aud.id_articulo,
                a.cod_int_artic,
                a.des_artic,
                aud.id_articulo_ubicacion_default,
                us.id_ubicacion_sucursal,
                us.tipo_ubicacion,
                us.tarima_ub,
                us.pasillo_ub,
                us.anaquel_ub,
                us.nivel_ub,
                us.posicion_ub
            FROM articulo_ubicacion_default aud
            JOIN ubicacion_sucursal us ON us.id_ubicacion_sucursal = aud.id_ubicacion_default
            JOIN articulo a ON a.id_artic = aud.id_articulo
            WHERE aud.id_empresa_sucursal = :id_empresa_sucursal
              AND aud.id_articulo IN (
                  SELECT aud2.id_articulo
                  FROM articulo_ubicacion_default aud2
                  JOIN ubicacion_sucursal us2 ON us2.id_ubicacion_sucursal = aud2.id_ubicacion_default
                  WHERE aud2.id_empresa_sucursal = :id_empresa_sucursal
                    AND us2.tipo_ubicacion <> 'TARIMA'
                  GROUP BY aud2.id_articulo
                  HAVING COUNT(*) > 1
              )
            ORDER BY a.cod_int_artic, us.tipo_ubicacion, us.pasillo_ub, us.anaquel_ub, us.nivel_ub, us.posicion_ub;
            `,
            { replacements: { id_empresa_sucursal }, type: QueryTypes.SELECT }
        );
    },

    // Artículos con existencia real en la sucursal pero SIN ninguna ubicación default
    // asignada. Se limita a los que tienen stock > 0 porque el catálogo completo tiene
    // miles de artículos sin movimiento; listar todo eso no sería accionable.
    getSinUbicacionDefault: async (id_empresa_sucursal: string) => {
        return await dbLocal.query<{
            id_articulo: string;
            cod_int_artic: number;
            des_artic: string;
            existencia_total: string;
        }>(
            `
            SELECT
                a.id_artic AS id_articulo,
                a.cod_int_artic,
                a.des_artic,
                SUM(sul.cantidad) AS existencia_total
            FROM stock_ubicacion_lote sul
            JOIN articulo a ON a.id_artic = sul.id_articulo
            WHERE sul.id_empresa_sucursal = :id_empresa_sucursal
              AND sul.cantidad > 0
              AND NOT EXISTS (
                  SELECT 1 FROM articulo_ubicacion_default aud
                  WHERE aud.id_articulo = sul.id_articulo
                    AND aud.id_empresa_sucursal = sul.id_empresa_sucursal
              )
            GROUP BY a.id_artic, a.cod_int_artic, a.des_artic
            ORDER BY existencia_total DESC;
            `,
            { replacements: { id_empresa_sucursal }, type: QueryTypes.SELECT }
        );
    },

    // Ubicaciones para elegir como default: anaqueles/estantería que hoy NO son default de
    // ningún OTRO artículo, más TODAS las tarimas (una tarima física guarda varios productos,
    // así que nunca se considera "ocupada"; un artículo puede tener a la vez un default de
    // anaquel y uno de tarima). Se excluye la propia ubicación actual del artículo que se está
    // reasignando, para que también pueda re-elegirla sin que cuente como "ocupada por sí mismo".
    getUbicacionesLibres: async (id_empresa_sucursal: string, id_articulo_excluir?: string) => {
        return await dbLocal.query<{
            id_ubicacion_sucursal: string;
            tipo_ubicacion: string;
            tarima_ub: string | null;
            pasillo_ub: string | null;
            anaquel_ub: string | null;
            nivel_ub: string | null;
            posicion_ub: string | null;
        }>(
            `
            SELECT us.id_ubicacion_sucursal, us.tipo_ubicacion, us.tarima_ub, us.pasillo_ub, us.anaquel_ub, us.nivel_ub, us.posicion_ub
            FROM ubicacion_sucursal us
            WHERE us.id_empresa_sucursal = :id_empresa_sucursal
              AND (
                  us.tipo_ubicacion = 'TARIMA'
                  OR NOT EXISTS (
                      SELECT 1 FROM articulo_ubicacion_default aud
                      WHERE aud.id_ubicacion_default = us.id_ubicacion_sucursal
                        AND aud.id_empresa_sucursal = us.id_empresa_sucursal
                        AND (:id_articulo_excluir::uuid IS NULL OR aud.id_articulo <> :id_articulo_excluir)
                  )
              )
            ORDER BY us.tipo_ubicacion, us.pasillo_ub, us.tarima_ub, us.anaquel_ub, us.nivel_ub, us.posicion_ub;
            `,
            { replacements: { id_empresa_sucursal, id_articulo_excluir: id_articulo_excluir ?? null }, type: QueryTypes.SELECT }
        );
    },
};
