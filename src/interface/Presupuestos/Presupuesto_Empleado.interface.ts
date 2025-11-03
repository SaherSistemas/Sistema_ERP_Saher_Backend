export interface IPresupuestoEmpleado{
    id_presupuesto_empleado: string;
    id_presupuesto:string;
    id_empre: string;
    id_empleado: string;
    turnos_planeado: number;
    turnos_reales?: number;
    monto_planeado: number;
    monto_real?: number;
}

export interface ICreateOrUpdatePresupuestoEmpleado{
    id_empre: string;
    id_presupuesto:string;
    id_empleado: string;
    turnos_planeado: number;
    turnos_reales?: number;
    monto_planeado: number;
    monto_real?: number;
}