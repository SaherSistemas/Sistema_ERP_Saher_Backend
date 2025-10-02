import { IEmpleado } from "../Empleado.interface";

export interface ICreateAgente {
    id_empleado: string;
    comision: number;
}

export interface IAgente {
    id_agente?: string;
    empleado: IEmpleado;
    fecha_alta_agente: string;
    fecha_baja_agente?: string;
    comision_agente: number;
    activo_agente: boolean;
}
