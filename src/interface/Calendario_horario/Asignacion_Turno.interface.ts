export interface IAsignacion_Turno {
    id_asignacion: string;
    id_turno: string; // qué turno cubre
    id_empleado: string; 
    estado: 'asignado' | 'reemplazado' | 'ausente' | 'completado';
    creado_por: string; 
    fecha_asignacion: Date;
    observaciones?: string; // Motivo, cambio, sustitución, etc.
}


export interface ICreateOrUpdateAsignacion_Turno {
    id_turno: string; 
    id_empleado: string; 
    estado: 'asignado' | 'reemplazado' | 'ausente' | 'completado';
    creado_por: string; 
    observaciones?: string; 
}