export interface IMonedero{
    id_monedero:string;
    saldo_monedero:number;
    fecha_creacion:Date;
    fecha_expiro:Date;
    id_cliente:string;
}

export interface ICreateOrUpdateMonedero{
    saldo_monedero:number;
    fecha_creacion:Date;
    fecha_expiro:Date;
    id_cliente:string;
}