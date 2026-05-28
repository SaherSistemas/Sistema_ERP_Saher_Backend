import { Comision_Regla_AgenteRepository } from '../repositories/Comision_Regla_Agente.repository';
import { IUpsertReglaBase, IUpsertExcepcion, ReglaJson } from '../interface/Comision_Regla_Agente.interface';

// ── Regla por defecto si un agente no tiene ninguna configurada ────────────────
const REGLA_DEFAULT: ReglaJson = { tipo: 'anticipado', pct: 5 };

export const Comision_Regla_AgenteService = {

    // ── Todas las reglas de todos los agentes ─────────────────────────────────
    // Devuelve el array plano tal como lo guarda el repositorio.
    // El frontend construye su mapa agente → { regla_base, excepciones }.
    getAll: async () => {
        return await Comision_Regla_AgenteRepository.getAll();
    },

    // ── Reglas de un agente concreto ──────────────────────────────────────────
    getByAgente: async (id_agente: string) => {
        return await Comision_Regla_AgenteRepository.getByAgente(id_agente);
    },

    // ── UPSERT regla base ─────────────────────────────────────────────────────
    upsertReglaBase: async (data: IUpsertReglaBase) => {
        _validarRegla(data.regla_json);
        return await Comision_Regla_AgenteRepository.upsertReglaBase(data);
    },

    // ── UPSERT excepción por cliente ──────────────────────────────────────────
    upsertExcepcion: async (data: IUpsertExcepcion) => {
        _validarRegla(data.regla_json);
        return await Comision_Regla_AgenteRepository.upsertExcepcion(data);
    },

    // ── Eliminar excepción ────────────────────────────────────────────────────
    deleteExcepcion: async (id_agente: string, id_cliente_alm: string) => {
        const deleted = await Comision_Regla_AgenteRepository.deleteExcepcion(id_agente, id_cliente_alm);
        if (deleted === 0) throw new Error('Excepción no encontrada');
        return { ok: true };
    },

    // ── Regla efectiva para un par agente/cliente (útil para auditorías) ──────
    // Devuelve la excepción si existe, si no la base, si no la default.
    getReglaEfectiva: async (id_agente: string, id_cliente_alm: string): Promise<ReglaJson> => {
        const excepcion = await Comision_Regla_AgenteRepository.getExcepcion(id_agente, id_cliente_alm);
        if (excepcion) return excepcion.regla_json as ReglaJson;

        const base = await Comision_Regla_AgenteRepository.getReglaBase(id_agente);
        if (base) return base.regla_json as ReglaJson;

        return REGLA_DEFAULT;
    },
};

// ── Validaciones internas ─────────────────────────────────────────────────────

function _validarRegla(regla: ReglaJson) {
    if (!regla?.tipo) throw new Error('El campo tipo_regla es requerido');

    if (regla.tipo === 'anticipado' || regla.tipo === 'fijo') {
        if (typeof regla.pct !== 'number' || regla.pct < 0 || regla.pct > 100) {
            throw new Error('El porcentaje debe ser un número entre 0 y 100');
        }
        return;
    }

    if (regla.tipo === 'escalonado') {
        if (!Array.isArray(regla.tramos) || regla.tramos.length === 0) {
            throw new Error('La regla escalonada debe tener al menos un tramo');
        }
        for (const t of regla.tramos) {
            if (typeof t.dias_max !== 'number' || typeof t.pct !== 'number') {
                throw new Error('Cada tramo debe tener dias_max y pct numéricos');
            }
        }
        return;
    }

    throw new Error(`Tipo de regla no válido: ${(regla as any).tipo}`);
}
