export interface IClienteAlmacen {
  id_cliente_alm: string;
  id_interno_cliente_alm: number;
  razon_social_cliente_alm: string;
  nom_corto_cliente_alm: string;
  nombre_cliente_alm: string;
  apellido_pat_cliente_alm: string;
  apellido_mat_cliente_alm: string;
  curp_cliente_alm: string;
  rfc_cliente_alm: string;
  calle_cliente_alm: string;
  id_colonia_cliente_alm: string; //UUID DE MODELO COLONIA
  num_telefono_cliente_alm: string;
  limite_credito_cliente_alm: number;
  plazo_pago_cliente_alm: number;
  fecha_de_baja_cliente_alm: Date;
  limite_factura_cliente_alm: number;
  id_agente_cliente_alm: string; //UUID DE MODELO AGENTE
  email_cliente_alm: string;
  id_regimen_fiscal_cliente_alm: string; //CHAR(3) MODELO DE REGIMEN FISCAL
  forma_pago_cliente_alm: number; //MODELO METODO DE PAGO
  tipo_de_pago: string; //VARCHAR(3)  PUE ó PPD
  uso_decfdi_cliente_alm: string; //CHAR(3) G03
}

export interface ICreateClienteAlmacen {
  razon_social_cliente_alm: string;
  nom_corto_cliente_alm: string;
  nombre_cliente_alm: string;
  apellido_pat_cliente_alm: string;
  apellido_mat_cliente_alm: string;
  curp_cliente_alm: string;
  rfc_cliente_alm: string;
  calle_cliente_alm: string;
  id_colonia_cliente_alm: string; //UUID DE MODELO COLONIA
  num_telefono_cliente_alm: string;
  limite_credito_cliente_alm: number;
  plazo_pago_cliente_alm: number;
  fecha_de_baja_cliente_alm: Date;
  limite_factura_cliente_alm: number;
  id_agente_cliente_alm: string; //UUID DE MODELO AGENTE
  email_cliente_alm: string;
  id_regimen_fiscal_cliente_alm: string; //CHAR(3) MODELO DE REGIMEN FISCAL
  forma_pago_cliente_alm: number; //MODELO METODO DE PAGO
  tipo_de_pago: string; //VARCHAR(3)  PUE ó PPD
  uso_decfdi_cliente_alm: string; //CHAR(3) G03
}
