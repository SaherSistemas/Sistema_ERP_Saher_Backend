export interface ICatFormaPago {
  id_forma_de_pago: string;
  descripcion_forma_de_pago: string;
}

export interface ICatFormaPagoCreate {
  id_forma_de_pago: string;
  descripcion_forma_de_pago: string;
}

export interface ICatFormaPagoUpdate {
  descripcion_forma_de_pago?: string;
}
