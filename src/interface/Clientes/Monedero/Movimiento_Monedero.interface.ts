export interface IMonederoCliente{
    id_mov_monedero:string;
    id_movimiento:string;
    cantidad_mov:number;
    tipo_mov:string;
    fecha_mov:Date;
    id_empre:string;
}

export interface ICreateOrUpdateMovMonederoCliente{
    id_movimiento:string;
    cantidad_mov:number;
    tipo_mov:string;
    fecha_mov:Date;
    id_empre:string;
}