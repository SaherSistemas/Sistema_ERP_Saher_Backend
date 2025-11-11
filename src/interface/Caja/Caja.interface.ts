export interface ICaja {
    id_caja: string;
    nombre_caja: string;
    id_empre: string;
    activa: boolean;
}
export interface ICreateUpdateCaja {
    nombre_caja: string;
    id_empre: string;
    activa: boolean;
}