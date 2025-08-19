export interface IUsoOferta{
    id_uso: string;
    id_oferta: string;
    id_cliente: string;
    id_venta: string;
    fecha_uso: Date;
}
export interface ICreateOrUpdateUsoOferta{
    id_oferta: string;
    id_cliente: string;
    id_venta: string;
    fecha_uso: Date;
}