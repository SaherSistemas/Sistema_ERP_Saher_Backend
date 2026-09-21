import { v4 as uuidv4 } from "uuid";
import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";

type LineaAcomodo = { ubicacion_id: string; cantidad: number };

const toInt = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
export const AcomodoServices = {
    obtenerPendientesAcomodo: async (id_empresa_sucursal: string, cb?: string) => {
        return await Stock_Ubicacion_LoteRepository.findPendientesDeAcomodo(id_empresa_sucursal, cb);
    },

    acomodarArticulo: async (
        id_empresa_sucursal: string,
        payload: { id_stock_ubicacion_lote: string; lineas: LineaAcomodo[] },
        tx?: Transaction
    ) => {
        const id_stock_ubicacion_lote = String(payload?.id_stock_ubicacion_lote || "").trim();
        const lineasRaw = payload?.lineas;

        if (!id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!id_stock_ubicacion_lote) throw new Error("id_stock_ubicacion_lote requerido");
        if (!Array.isArray(lineasRaw) || lineasRaw.length === 0) throw new Error("lineas requeridas");

        // normaliza lineas
        const lineas = lineasRaw
            .map(l => ({
                ubicacion_id: String(l?.ubicacion_id || "").trim(),
                cantidad: toInt(l?.cantidad),
            }))
            .filter(l => l.ubicacion_id);

        if (!lineas.length) throw new Error("lineas inválidas");

        for (const l of lineas) {
            if (!Number.isInteger(l.cantidad) || l.cantidad <= 0) {
                throw new Error(`cantidad inválida para ubicacion ${l.ubicacion_id}`);
            }
        }

        // no duplicadas
        const seen = new Set<string>();
        for (const l of lineas) {
            if (seen.has(l.ubicacion_id)) throw new Error(`ubicacion repetida: ${l.ubicacion_id}`);
            seen.add(l.ubicacion_id);
        }

        const run = async (t: Transaction) => {
            const pendiente = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(
                id_empresa_sucursal,
                id_stock_ubicacion_lote,
                t
            );
            if (!pendiente) throw new Error("No existe stock_ubicacion_lote");

            const p = pendiente.get({ plain: true });

            // Debe estar pendiente (ubicación NULL)
            if (p.id_ubicacion_sucursal) {
                throw new Error("Este registro ya está acomodado (id_ubicacion_sucursal no es NULL)");
            }

            if (!p.id_lote) {
                throw new Error("El registro original no trae id_lote (NULL). Corrige tu data.");
            }

            const cantPendiente = toInt(p.cantidad);
            if (!Number.isInteger(cantPendiente) || cantPendiente <= 0) {
                throw new Error("Cantidad pendiente inválida");
            }

            const suma = lineas.reduce((acc, l) => acc + l.cantidad, 0);

            // Si quieres permitir parcial: cambia a if (suma > cantPendiente) ...
            if (suma !== cantPendiente) {
                throw new Error(`La suma (${suma}) no coincide con la pendiente (${cantPendiente})`);
            }

            const [primera, ...resto] = lineas;

            // Si ese lote ya está en esa ubicación, se SUMA a la fila existente en vez de duplicarla
            const existentePrimera = await Stock_Ubicacion_LoteRepository.findMismaUbicacionYLote(
                id_empresa_sucursal, p.id_articulo, p.id_lote, primera.ubicacion_id, t, id_stock_ubicacion_lote
            );
            let actualizado;
            if (existentePrimera) {
                await existentePrimera.update(
                    { cantidad: (Number(existentePrimera.cantidad) || 0) + primera.cantidad },
                    { transaction: t }
                );
                await pendiente.destroy({ transaction: t });
                actualizado = existentePrimera;
            } else {
                actualizado = await Stock_Ubicacion_LoteRepository.updateUbicacionYCantidad(
                    id_empresa_sucursal,
                    id_stock_ubicacion_lote,
                    { id_ubicacion_sucursal: primera.ubicacion_id, cantidad: primera.cantidad },
                    t
                );
            }

            const creados = [];
            for (const linea of resto) {
                const existente = await Stock_Ubicacion_LoteRepository.findMismaUbicacionYLote(
                    id_empresa_sucursal, p.id_articulo, p.id_lote, linea.ubicacion_id, t
                );
                if (existente) {
                    await existente.update(
                        { cantidad: (Number(existente.cantidad) || 0) + linea.cantidad },
                        { transaction: t }
                    );
                    creados.push(existente.get({ plain: true }));
                    continue;
                }
                const nuevo = await Stock_Ubicacion_LoteRepository.create(
                    {
                        id_empresa_sucursal,
                        id_articulo: p.id_articulo,
                        id_lote: p.id_lote, // ✅ ESTE ES EL FIX
                        id_ubicacion_sucursal: linea.ubicacion_id,
                        cantidad: linea.cantidad,
                        cantidad_apartada: 0,
                    },
                    t
                );
                creados.push(nuevo.get({ plain: true }));
            }

            return {
                actualizado: actualizado?.get({ plain: true }) ?? null,
                creados,
                total_lineas: lineas.length,
                suma,
            };
        };

        if (tx) return run(tx);
        return dbLocal.transaction(run);
    },

};
