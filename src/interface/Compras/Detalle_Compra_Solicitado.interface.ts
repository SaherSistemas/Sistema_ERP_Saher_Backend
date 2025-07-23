export interface IDetalle_Compra_Solicitado {
    id_detcompsol: string
    idcomp_detcompsol: string
    idarticulo_detcompsol: string
    cantidad_detcompsol: number
    precio_detcompsol: number
    total?: number; // <-- AGREGADO
}

export interface ICreateOrUpdateDetalleCompraSolicitado {
    id_articulo_detcompsol: string
    cantidad_detcompsol: number
    precio_detcompsol: number
}