export interface IMovimientoMonedero {
    id_mov_monedero: string;
    id_monedero: string;
    cantidad_mov: number;
    tipo_mov: "ACUMULO" | "DESCUENTO" | "REVERSO" | "AJUSTE";
    referencia?: string;
    fecha_mov: Date;
    id_empre: string;
}


export interface ICreateOrUpdateMovMonederoCliente {
    id_monedero: string;
    cantidad_mov: number;
    tipo_mov: "ACUMULO" | "DESCUENTO" | "REVERSO" | "AJUSTE";
    referencia?: string;
    fecha_mov: Date;
    id_empre: string;
}