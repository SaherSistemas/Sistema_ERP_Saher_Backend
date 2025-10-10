export interface IPeriodo_Calendario{
    id_periodo: string;
    anio: number;
    mes: number;
    estado: 'borrador' | 'activo' | 'cerrado';
    creado_por: string; // FK a empleado/usuario
    fecha_creacion: Date;
    fecha_cierre?: Date; // opcional, puede ser null
}

export interface ICreateOrUpdatePeriodo_Calendario{
    id_periodo?: string; 
    anio: number;
    mes: number;
    estado: 'borrador' | 'activo' | 'cerrado';
    creado_por: string; 
}
