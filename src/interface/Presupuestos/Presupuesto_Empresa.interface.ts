export interface IPresupuesto_Empresa {
    id_presupuesto: string;
    id_empre: string;
    anio: number;
    mes: number;
    monto_total: number;
    turnos_planeados?: number;
    turnos_reales?: number;
    monto_por_turno?: number;
    estado_presupuesto: 'PLANIFICADO' | 'EJECUCION' | 'CERRADO';
    fecha_cierre?: Date;
}

export interface ICreateOrUpdatePresupuesto_Empresa {
    id_empre: string;
    anio: number;
    mes: number;
    monto_total: number;
    turnos_planeados: number;
    turnos_reales?: number;
    monto_por_turno?: number;
    estado_presupuesto: 'PLANIFICADO' | 'EJECUCION' | 'CERRADO';
    fecha_cierre?: Date;
}
