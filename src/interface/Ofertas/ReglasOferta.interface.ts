

export interface IReglasOferta {
    id_regla: string;  
    id_oferta: string;        
    tipo_beneficio: string;       // Tipo de beneficio (ej: "DESCUENTO", "3x2", "CASHBACK", "ENVIO_GRATIS")
    valor : number;             // Valor numérico asociado a la acción (ej: 10 = 10% desc, 50 = $50 cashback)
    cantidad_minima: number;       // Cantidad mínima de artículos para activar la regla (ej: compra 3 para 3x2)
    cantidad_regalo: number;       // Número de artículos gratis/regalo que da la oferta (ej: en 3x2 sería 1)
    articulo_gratis: string;   // id del artículo que se dará gratis (ej: "GEL123" → Gel antibacterial de regalo)
    monto_minimo_total: number;      // Monto mínimo de compra requerido para aplicar la oferta ($500, por ejemplo)
    minimo_articulo: number;   // Cantidad mínima de cierto artículo específico para aplicar (ej: compra 2 Paracetamol)
    tope_desc: number;         // Límite máximo del descuento (ej: hasta $200 aunque sea 10%)
    cantidad_max_dias: number; // Límite de veces que se puede usar la oferta por día (ej: 2 veces al día)
    codigo_cupon: string;      // Código que debe ingresar el cliente (ej: "VERANO2025")
    max_usos_cliente: number;  // Máx. veces que un mismo cliente puede usar esta oferta
    max_usos_global: number;   // Máx. veces que la oferta puede usarse en total (ej: primeras 100 redenciones)
    exclusiva: boolean;        // Si es true → no se puede combinar con otras ofertas
}

export interface ICreateOrUpdateReglasOferta {
  id_oferta: string;        
  tipo_beneficio: string; 
  valor?: number;
  cantidad_minima?: number; 
  cantidad_regalo?: number;
  articulo_gratis?: string;
  monto_minimo_total?: number;
  minimo_articulo?: number; 
  tope_desc?: number;
  cantidad_max_dias?: number;
  codigo_cupon?: string;
  max_usos_cliente?: number;
  max_usos_global?: number;
  exclusiva?: boolean;
}


// type TipoBeneficio = "PORCENTAJE" | "MONTO_FIJO" | "X_POR_Y" | "ARTICULO_GRATIS" | "CUPON";

// interface BaseRegla {
//   id_oferta: string;
//   exclusiva?: boolean;
//   max_usos_cliente?: number;
//   max_usos_global?: number;
//   cantidad_max_dias?: number;
//   tope_desc?: number;
//   minimo_articulo?: number;
//   monto_minimo_total?: number;
// }

// interface ReglaPorcentaje extends BaseRegla {
//   tipo_beneficio: "PORCENTAJE";
//   valor: number;
//   cantidad_minima?: number;
// }

// interface ReglaMontoFijo extends BaseRegla {
//   tipo_beneficio: "MONTO_FIJO";
//   valor: number;
//   cantidad_minima?: number;
// }

// interface ReglaXPorY extends BaseRegla {
//   tipo_beneficio: "X_POR_Y";
//   cantidad_minima: number;
//   cantidad_regalo: number;
//   articulo_gratis?: string;
// }

// interface ReglaArticuloGratis extends BaseRegla {
//   tipo_beneficio: "ARTICULO_GRATIS";
//   cantidad_minima: number;
//   articulo_gratis: string;
//   cantidad_regalo?: number;
// }

// interface ReglaCupon extends BaseRegla {
//   tipo_beneficio: "CUPON";
//   codigo_cupon: string;
//   valor?: number;
// }

// export type ICreateOrUpdateReglasOfertaOPCION =
//   | ReglaPorcentaje
//   | ReglaMontoFijo
//   | ReglaXPorY
//   | ReglaArticuloGratis
//   | ReglaCupon;
