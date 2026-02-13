// src/modules/Inventario/Stock_Ubicacion_Lote/interface/Stock.dto.ts
export interface IAddStockDTO {
    id_empresa_sucursal: string;            // token
    id_ubicacion_sucursal: string;

    // puedes mandar lote directo o resolver por CB
    id_lote?: string;
    cod_barr_artic?: string;               // opcional si quieres validar artículo
    cantidad: number;                      // >0

    // si quieres apartar
    cantidad_apartada?: number;            // opcional
}


export type StockUpsertRow = {
    id_articulo: string;
    id_empresa_sucursal;
    id_lote: string;
    cantidad: number;
    cantidad_apartada?: number;
};