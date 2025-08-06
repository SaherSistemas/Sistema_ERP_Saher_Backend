import { ILoteRecibido } from "../LotesYCaducidad/LotesSolicitadoCompra.interface";

export interface IStockSucursal {
    id_stockSucursal: string;
    id_artic: string;
    id_empre: string;
    cantidad_stockSucursal: number;
}

export interface ICreateOrUpdateStockSucursal {
    id_comp: string
    precio: string
    id_artic: string
    id_empresa: string
    id_detcomprec: string
    lotes: ILoteRecibido[]
}

export interface IDataProductosStock {
    id_empresa: string
    productosEntrada: ICreateOrUpdateStockSucursal[];
}