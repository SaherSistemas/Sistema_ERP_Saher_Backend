import { v4 as uuidv4 } from 'uuid';
import Comision_Regla_Agente from '../model/Comision_Regla_Agente.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { IUpsertReglaBase, IUpsertExcepcion, ReglaJson } from '../interface/Comision_Regla_Agente.interface';

export const Comision_Regla_AgenteRepository = {

    // ── Obtener TODAS las reglas de un agente (base + excepciones) ────────────
    getByAgente: async (id_agente: string) => {
        return await Comision_Regla_Agente.findAll({
            where: { id_agente },
            include: [
                {
                    model: Cliente_Almacen,
                    attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
                    required: false,
                },
            ],
        });
    },

    // ── Obtener TODAS las reglas de TODOS los agentes (para carga inicial) ────
    getAll: async () => {
        return await Comision_Regla_Agente.findAll({
            include: [
                {
                    model: Cliente_Almacen,
                    attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
                    required: false,
                },
            ],
            order: [
                ['id_agente', 'ASC'],
                // Las reglas base (id_cliente_alm IS NULL) van primero
                ['id_cliente_alm', 'ASC NULLS FIRST' as any],
            ],
        });
    },

    // ── Regla base del agente (id_cliente_alm = NULL) ─────────────────────────
    getReglaBase: async (id_agente: string) => {
        return await Comision_Regla_Agente.findOne({
            where: { id_agente, id_cliente_alm: null },
        });
    },

    // ── Excepción de un cliente concreto ──────────────────────────────────────
    getExcepcion: async (id_agente: string, id_cliente_alm: string) => {
        return await Comision_Regla_Agente.findOne({
            where: { id_agente, id_cliente_alm },
        });
    },

    // ── UPSERT regla base ─────────────────────────────────────────────────────
    upsertReglaBase: async (data: IUpsertReglaBase) => {
        const existente = await Comision_Regla_Agente.findOne({
            where: { id_agente: data.id_agente, id_cliente_alm: null },
        });

        if (existente) {
            await existente.update({
                tipo_regla: data.regla_json.tipo,
                regla_json: data.regla_json,
            });
            return existente;
        }

        return await Comision_Regla_Agente.create({
            id_regla:      uuidv4(),
            id_agente:     data.id_agente,
            id_cliente_alm: null,
            tipo_regla:    data.regla_json.tipo,
            regla_json:    data.regla_json,
        });
    },

    // ── UPSERT excepción por cliente ──────────────────────────────────────────
    upsertExcepcion: async (data: IUpsertExcepcion) => {
        const existente = await Comision_Regla_Agente.findOne({
            where: { id_agente: data.id_agente, id_cliente_alm: data.id_cliente_alm },
        });

        if (existente) {
            await existente.update({
                tipo_regla: data.regla_json.tipo,
                regla_json: data.regla_json,
            });
            return existente;
        }

        return await Comision_Regla_Agente.create({
            id_regla:      uuidv4(),
            id_agente:     data.id_agente,
            id_cliente_alm: data.id_cliente_alm,
            tipo_regla:    data.regla_json.tipo,
            regla_json:    data.regla_json,
        });
    },

    // ── Eliminar excepción de un cliente ──────────────────────────────────────
    deleteExcepcion: async (id_agente: string, id_cliente_alm: string) => {
        const deleted = await Comision_Regla_Agente.destroy({
            where: { id_agente, id_cliente_alm },
        });
        return deleted; // número de filas eliminadas
    },

    // ── Eliminar TODAS las reglas de un agente (base + excepciones) ───────────
    deleteByAgente: async (id_agente: string) => {
        return await Comision_Regla_Agente.destroy({ where: { id_agente } });
    },
};
