export interface IMetodoPago{
    id_metodo_pago: string;
    clave_metodo_pago: string;
    nombre_metodo_pago: string;
    es_fisico: boolean;
    status_metodo_pago: boolean;
}

export interface ICreateOrUpdateMetodoPago{
    clave_metodo_pago: string;
    nombre_metodo_pago: string;
    es_fisico: boolean;
    status_metodo_pago: boolean;
}

export interface IMetodoPagoVentaInput {
  id_metodo_pago: string;  
  nombre_metodo_pago: string;
  monto: number;     

//   referencia?: string;     
//   propina?: number;         
//   cambio?: number;
}