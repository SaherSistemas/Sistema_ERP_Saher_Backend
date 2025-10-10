export interface ITurno_Programado{
    id_turno: string;
    id_periodo: string; //a que mes pertenece
    fecha: Date; // Día del turno
    hora_inicio: string; 
    hora_fin: string; 
    id_sucursal: string; // FK a sucursal
    rol_requerido: string; // FK a rol
    estado: 'vacante' | 'asignado' | 'cancelado';
    observaciones?: string; 
}


export interface ICreateOrUpdateTurno_Programado{   
    id_periodo: string; 
    fecha: Date; 
    hora_inicio: string; 
    hora_fin: string; 
    id_sucursal: string; 
    rol_requerido: string; 
    estado: 'vacante' | 'asignado' | 'cancelado';
    observaciones?: string; 
}


// Qué representa:
// Cada bloque de tiempo laboral en un día específico, dentro del periodo.
// Ejemplo: “Lunes 7 de octubre, 09:00–17:00, Sucursal Centro”.
