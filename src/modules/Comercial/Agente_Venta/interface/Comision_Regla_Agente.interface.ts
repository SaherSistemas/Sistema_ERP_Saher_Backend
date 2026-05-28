// ── Tipos de regla que acepta el motor de comisiones ─────────────────────────

export type TipoRegla = 'anticipado' | 'fijo' | 'escalonado';

export interface ReglaAnticipado {
    tipo: 'anticipado';
    pct: number;        // % sobre el monto pagado, solo si pago < fecha_vencimiento
}

export interface ReglaFijo {
    tipo: 'fijo';
    pct: number;        // % siempre, independiente de cuándo pagó
}

export interface TramoEscalonado {
    dias_max: number;   // hasta este día de retraso aplica este %
    pct: number;
}

export interface ReglaEscalonado {
    tipo: 'escalonado';
    tramos: TramoEscalonado[];  // ordenados de menor a mayor dias_max
}

export type ReglaJson = ReglaAnticipado | ReglaFijo | ReglaEscalonado;

// ── Payloads de entrada ───────────────────────────────────────────────────────

// Guardar / actualizar regla base de un agente
export interface IUpsertReglaBase {
    id_agente:  string;
    regla_json: ReglaJson;
}

// Guardar / actualizar excepción de un cliente dentro de un agente
export interface IUpsertExcepcion {
    id_agente:     string;
    id_cliente_alm: string;
    regla_json:    ReglaJson;
}

// Eliminar excepción
export interface IDeleteExcepcion {
    id_agente:     string;
    id_cliente_alm: string;
}
