import { IProveedor } from "../Proveedor/Proveedor.interface"

export interface ICompra_Proveedor {
    id_comp: string;
    idprove_comp: string;
    folio_factura_compra: string;
    total_comp_factura: number;
    total_iva_factura: number;
    total_comp_recibido: number;
    total_iva_recibido: number;
    costo_por_envio: number;
    estado_comp: string;
    id_compra_general: string;

    inicio_de_compra_proveedor: Date | null;
    fin_de_compra_proveedor: Date | null;
    id_empleado_compra: string | null;
    fecha_enviada_proveedor: Date | null;
    fecha_mercancia_recibida_proveedor: Date | null;
    inicio_de_registro_lotes: Date | null;
    fin_de_registro_lotes: Date | null;
    inicio_de_checado: Date | null;
    fin_de_checado: Date | null;
    inicio_acomodo_mercancia: Date | null;
    fin_acomodo_mercancia: Date | null;
    proveedor: IProveedor;
}


export interface ICreateCompra_Proveedor {
    idprove_comp: string
    id_compra_general: string
}
export interface IEsctructuraCompra {
    id_empresa: string;
    id_listproveedor: string
    tipo_compra: string
    detalle: {
        idarticulo_detcompsol: string
        cantidad_detcompsol: number
        precio_detcompsol: number
    }
}




