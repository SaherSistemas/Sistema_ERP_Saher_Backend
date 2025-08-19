import { TimeLike } from "fs";
import { IAlcanceOferta } from "./AlcanceOferta.interface";
import { IUsoOferta } from "./UsoOferta.interface";



type HHMM = `${number}:${number}`;                           // "16:00"
type HHMMSS = `${number}:${number}:${number}`;               // "16:00:00"
type Weekday = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN';

export interface IOferta{
    id_oferta: string;
    nombre_oferta: string;
    descripcion: string;
    fecha_ini_oferta: string;
    fecha_fin_oferta: string;
    dias_semana: Weekday;
    hora_ini:  HHMM | HHMMSS;
    hora_fin:  HHMM | HHMMSS;
    creada_por: string;
    canal_oferta: string;
    status_oferta:string;
        alcances: IAlcanceOferta[];
}

export interface ICreateOrUpdateOferta{
    nombre_oferta: string;
    fecha_ini_oferta: string;
    fecha_fin_oferta: string;
    dias_semana:string;
    hora_ini:  HHMM | HHMMSS;
    hora_fin:  HHMM | HHMMSS;
    creada_por: string;
    canal_oferta: string;
    status_oferta:string;
        alcances: IAlcanceOferta[];
}



