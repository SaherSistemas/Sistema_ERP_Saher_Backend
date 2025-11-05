export interface IAsignacion_Empleado_Sucursal {
    id_asignacion: string;
    id_empleado: string;
    id_empre: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    tipo: "FIJO" | 'TEMPORAL' | 'COBERTURA';
    turno: "AM" | 'PM';
    motivo: string;
    activo: boolean;
}

export interface ICreateOrUpdateAsignacion_Empleado_Sucursal {
    id_empleado: string;
    id_empre: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    tipo: "FIJO" | 'TEMPORAL' | 'COBERTURA';
    turno: "AM" | 'PM';
    motivo: string;
    activo: boolean;


}