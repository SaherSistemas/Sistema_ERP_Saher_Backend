export interface INotasCreditoProveedor {
    id_nc: string
    id_compra_proveedor: string
    folio_nc: string
    motivo_nc: string
    fecha_emision: Date
    total_nc: number
}


export interface ICreateNotasCreditoProveedor {
    id_compra_proveedor: string
    folio_nc: string
    motivo_nc: string
    fecha_emision: Date
    total_nc: number
}