export interface IStockSucursal {
    id_stockSucursal:string;
    id_artic:string;
    id_empre: string;
    cantidad_stockSucursal: number;
}

export interface ICreateOrUpdateStockSucursal {
    id_artic: string;
    id_empre: string;
    cantidad_stockSucursal:number;
}