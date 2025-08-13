export interface IVentaPago {
    id_venta_pago: string;
    id_venta: string;
    id_metodo_pago: string;
    monto: number;
   
}
export interface ICreateOrUpdateVentaPago {
  id_venta: string;
  id_metodo_pago: string;
  monto: number;
}

export interface IVentaPagoInput {
  id_venta: string;
  id_metodo_pago: string;
  monto: number;
}