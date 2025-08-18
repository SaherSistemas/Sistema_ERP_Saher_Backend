import { IAlcanceOferta } from "./AlcanceOferta.interface";

export interface IOferta{
    id_oferta: string;
    nombre_oferta: string;
    fecha_ini_oferta: string;
    fecha_fin_oferta: string;
    canal_oferta: string;
    status_oferta:boolean;
        alcances: IAlcanceOferta[];
}

export interface ICreateOrUpdateOferta{
    nombre_oferta: string;
    fecha_ini_oferta: string;
    fecha_fin_oferta: string;
    canal_oferta: string;
    status_oferta:boolean;
        alcances: IAlcanceOferta[];

}