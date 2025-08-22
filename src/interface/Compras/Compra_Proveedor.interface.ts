import { IProveedor } from "../Proveedor/Proveedor.interface"
import { ICompra_General } from "./Compra_General.interface"

export interface ICompra_Proveedor {
    id_comp: string;
    idprove_comp: string;
    folio_factura_compra: string;
    total_comp_factura: string;   // viene como string
    total_comp_recibido: string;  // viene como string
    costo_por_envio: string;      // viene como string
    estado_comp: 'R' | 'A' | 'F' | 'D' | string;
    id_compra_general: string;

    inicio_de_compra_proveedor: string | null;
    fin_de_compra_proveedor: string | null;
    id_empleado_compra: string | null;
    fecha_enviada_proveedor: string | null;
    fecha_mercancia_recibida_proveedor: string | null;
    inicio_de_registro_lotes: string | null;
    fin_de_registro_lotes: string | null;
    inicio_de_checado: string | null;
    fin_de_checado: string | null;
    inicio_acomodo_mercancia: string | null;
    fin_acomodo_mercancia: string | null;

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
        id_articulo_detcompsol: string
        cantidad_detcompsol: number
        precio_detcompsol: number
    }
}




