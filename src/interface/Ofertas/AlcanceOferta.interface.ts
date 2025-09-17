export const TIPOS_ALCANCE = [
  "GLOBAL",
  "EMPRESA",
  "ARTICULO",
  "CATEGORIA",
  "LOTE",
] as const;

export type TipoAlcance = (typeof TIPOS_ALCANCE)[number];

export type AlcanceParamsCaducidad = {
  tipo: 'CADUCIDAD';
  dias_restantes_max?: number;
  dias_restantes_min?: number;
  fecha_limite?: string;             
  incluir_vencidos?: boolean;
  solo_stock_disponible?: boolean;
};
export type AlcanceParams = AlcanceParamsCaducidad | null;

export interface IAlcanceOferta{
    id_alcance: string;
    id_oferta: string;
    tipo_alcance: string; 
    id_referencia: string | null; 
    params?: AlcanceParams;
}

export interface ICreateOrUpdateAlcanceOferta{
    id_oferta: string;
    tipo_alcance: string; 
    id_referencia: string | null; 
    params?: AlcanceParams;
}

