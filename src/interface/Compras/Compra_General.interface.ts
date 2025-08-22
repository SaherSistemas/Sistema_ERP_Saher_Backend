import { IArticulo } from "../Articulos/Articulo.interface"
import { IEmpresaSucursal } from "../Empresa_Sucursal/Empresa_Sucursal.interface"
import { ICompra_Proveedor } from "./Compra_Proveedor.interface"

export interface ICompra_General {
    id_compra_general: string
    id_interno_compra_gen: string
    fecha_inicio: string
    fecha_fin_captura: string
    estado_com: string
    total_compra_general: number
    id_empresa: IEmpresaSucursal
    ultimo_articulo_guardado: IArticulo
    comprasProveedor?: ICompra_Proveedor[];
}


export interface ICreateCompra_General {
    fecha_inicio: Date
    tipo_compra: string
    id_empre: string
    estado_comp: string
    ultimo_articulo_guardado?: string
}

