import { IProveedor } from "../Proveedor/Proveedor.interface"
import { ICompra_General } from "./Compra_General.interface"

export interface ICompra_Proveedor {
    id_comp: string
    proveedor: IProveedor
    folio_factura_compra: string
    total_comp: number
    estado_comp: string
    id_compra_general: ICompra_General
    inicio_de_compra_proveedor: Date
    fecha_enviada_proveedor: Date
    fecha_mercancia_recibida_proveedor: Date
    inicio_de_registro_lotes: Date
    fin_de_registro_lotes: Date
    inicio_de_checado: Date
    fin_de_checado: Date
}


export interface ICreateCompra_Proveedor {
    idprove_comp: string
    id_compra_general: string
}
export interface ICreateCompraProveedorYDetalleCompraSolicitado {
    id_empresa: string;
    id_listproveedor: string
    detalle: {
        id_articulo_detcompsol: string
        cantidad_detcompsol: number
        precio_detcompsol: number
    }
}




