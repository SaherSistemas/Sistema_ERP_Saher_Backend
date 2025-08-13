import { ILoteRecibido } from "../LotesYCaducidad/LotesSolicitadoCompra.interface";

export interface IStockSucursal {
    id_stockSucursal: string;
    id_artic: string;
    id_empre: string;
    cantidad_stockSucursal: number;
}

export interface ICreateOrUpdateStockSucursal {
    id_comp: string;
    precio: string; // unitario
    id_artic: string;
    id_empresa: string;
    id_detcomprec: string;
    lotes: ILoteRecibido[];
}

/** ← NUEVO: estructura de cada renglón de devolución */
export interface IProductoDevolucion {
    id_comp: string;
    id_detcomprec: string;
    cantidad_devolucion: number;
    lote: string | null;
    fecha_caducidad: string | null; // YYYY-MM-DD
    observacion: string;
}

/** ← NUEVO: payload con las “tres cosas” */
export interface IDataProductosStockConDevolucion {
    id_empresa: string;
    productosEntrada: ICreateOrUpdateStockSucursal[];
    productosDevolucion: IProductoDevolucion[];
}
