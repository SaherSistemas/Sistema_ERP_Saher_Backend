export interface DatosFacturacionCabecera {
    // Emisor
    nom_empre:               string;
    rfc_empre:               string;
    regimen_fiscal_empre:    string;
    serie_facturacion_empre: string;
    leyenda_factura_empre:   string | null;
    lugar_expedicion:        string;
    // Receptor
    razon_social_cliente:    string;
    rfc_cliente:             string;
    domicilio_fiscal:        string;
    regimen_fiscal_cliente:  string;
    uso_cfdi:                string;
    forma_pago:              string;
    metodo_pago:             string;
    // Crédito del cliente
    plazo_pago_cliente:      number;
    limite_por_factura:      number | null;
    // Pedido
    id_pedido_alm:           string;
    id_cliente_alm:          string;
    id_agente_alm:           string;
    cod_int_pedido_alm:      string;
    nombre_agente:           string | null;
    // Folio
    siguiente_folio:         number;
    // Dirección completa del receptor (para PDF traslado)
    calle_cliente:     string;
    colonia_cliente:   string;
    municipio_cliente: string;
    estado_cliente:    string;
    // Tipo de cliente
    // NULL = externo (Ingreso normal sin insert en POS viejo)
    // Número = empresa propia del grupo → siempre inserta en rme0010
    id_empresa_sys_anterior: number | null;
    // 'FAC' = empresa propia con CFDI timbrado (Ingreso); 'TRA' = traslado interno sin timbre
    tipo_comprobante:        string;
}

export interface ConceptoFacturacion {
    id_articulo:     string;
    cve_sat:         string;
    sat_medida:      string;
    desc_medida:     string;
    cod_int_artic:   number;
    cod_barras:      string;
    cantidad:        number;
    descripcion:     string;
    precio_unitario: number;
    descuento:       number;
    subtotal_linea:  number;
    tasa_iva:        number;
    impuesto_sat:    string;
    tipo_factor:     string;
    necesita_receta: boolean;
    lotes:           { lote: string; fecha_venci: string; cantidad: number; folio_factura_proveedor: string | null; nom_proveedor: string | null }[];
}

export interface DetalleParaEgreso {
    id_articulo:          string;
    descripcion_articulo: string;
    cantidad_facturada:   number;
    precio_artic:         number;
    subtotal:             number;
    tasa_iva:             number;
    cve_sat:              string;
    sat_medida:           string;
    desc_medida:          string;
}

export interface DatosFacturaParaTimbrar {
    id_factura:              string;
    tipo_cfdi:               string;
    uuid_sat:                string | null;
    subtotal_factura:        number;
    iva_factura:             number;
    total_factura:           number;
    id_cliente_alm:          string;
    id_forma_pago:           string;
    razon_social_cliente:    string;
    rfc_cliente:             string;
    regimen_fiscal_cliente:  string;
    domicilio_fiscal:        string;
    detalles:                DetalleParaEgreso[];
}
