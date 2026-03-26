export type EstadoEmpaque = 'PENDIENTE' | 'EN_PROCESO' | 'EMPACADO' | 'CANCELADO';

export interface IFinalizarEmpaquePayload {
    cajas: number;
    bolsas: number;
    nota?: string | null;
}

export interface IActualizarBultosPayload {
    cajas?: number;
    bolsas?: number;
    nota?: string | null;
}