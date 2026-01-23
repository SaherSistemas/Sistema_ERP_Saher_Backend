export type TipoEntidadRecibo = "PROVEEDOR" | "PAQUETERIA" | "MENSAJERIA" | "OTRO";

export interface ICreateRecepcionEntradaDTO {
    entidad_recibo: string;
    tipo_entidad: TipoEntidadRecibo;
    nombre_persona_entrega: string;
    cantidad_cajas?: number;
    cantidad_bolsas?: number;
    cantidad_tarimas?: number;
    observaciones?: string;
    firma: string; // data:image/png;base64,...
}

export interface IListRecepcionesQuery {
    search?: string;
    limit?: number;
    offset?: number;
}
