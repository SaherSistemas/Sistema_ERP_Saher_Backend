export interface IMonederoCliente{
    id_monedero:string;
    saldo_monedero:number;
    fecha_creacion:Date;
    fecha_expiro:Date;
    id_cliente:string;
}

export interface ICreateOrUpdateMonederoCliente{
    saldo_monedero:number;
    fecha_creacion:Date;
    fecha_expiro:Date;
    id_cliente:string;
}