export interface IMovimiento_Presupuesto{
    id_movimiento: string;
    id_presupuesto: string;
    id_empre: string;
    id_empleado: string;
    fecha_movimiento: Date;
    tipo: 'COBERTURA' | 'RECALCULO' | 'AJUSTE' | 'CREACION' | 'OTRO';
    
    descripcion?: string;
    valor_anterior: number;
    valor_nuevo: number;
    usuario_modifico: string;

}
