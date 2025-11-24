export interface IClienteAlmacen {
  id_cliente_alm: string; // UUID
  id_interno_cliente_alm: number; // SMALLINT
  razon_social_cliente_alm: string;
  nom_corto_cliente_alm: string;
  nombre_cliente_alm: string;
  apellido_pat_cliente_alm: string;
  apellido_mat_cliente_alm: string;
  curp_cliente_alm: string;
  rfc_cliente_alm: string;
  calle_cliente_alm: string;
  id_colonia_cliente_alm: string; // UUID -> FK Colonia
  num_telefono_cliente_alm: string;
  limite_credito_cliente_alm: number; // DECIMAL(12,2)
  plazo_pago_cliente_alm: number; // SMALLINT
  activo_cliente_alm: boolean;
  id_agente_cliente_alm: string; // UUID -> FK Agente_de_Venta
  email_cliente_alm: string;
  id_regimen_fiscal_cliente_alm: string; // CHAR(3)
  id_metodo_pago_cliente_alm: string; // STRING(5)
  id_forma_pago_cliente_alm: string; // STRING(2)
  uso_cfdi_cliente_alm: string; // STRING(5)
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
  id_colonia_cliente_alm: string;
  num_telefono_cliente_alm: string;
  limite_credito_cliente_alm: number;
  plazo_pago_cliente_alm: number;
  id_agente_cliente_alm: string;
  email_cliente_alm: string;
  id_regimen_fiscal_cliente_alm: string;
  id_metodo_pago_cliente_alm: string; // STRING(5)
  id_forma_pago_cliente_alm: string; // STRING(2)
  uso_cfdi_cliente_alm: string; // STRING(5)
}
