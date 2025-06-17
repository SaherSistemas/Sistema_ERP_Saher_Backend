import { IArticulo } from "../Articulos/Articulo.interface"
import { IEmpresaSucursal } from "../Empresa_Sucursal/Empresa_Sucursal.interface"

export interface ICompra_General {
    id_compra_general: string
    fecha_inicio: string
    fecha_fin: string
    estado_com: string
    total_compra_general: number
    id_empresa: IEmpresaSucursal
    ultimo_articulo_guardado: IArticulo
}


export interface ICreateCompra_General {
    fecha_inicio: Date
    id_empre: string
    estado_comp: string
    ultimo_articulo_guardado?: string
}

