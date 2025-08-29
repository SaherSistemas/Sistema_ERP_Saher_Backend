import { TimeLike } from "fs";
import { IAlcanceOferta } from "./AlcanceOferta.interface";
import { IUsoOferta } from "./UsoOferta.interface";
import { IReglasOferta } from "./ReglasOferta.interface";



type HHMM = `${number}:${number}`;                           // "16:00"
type HHMMSS = `${number}:${number}:${number}`;               // "16:00:00"
type Weekday = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN';
type canal = 'PDV'|'ECOM';

export interface IOferta{
    id_oferta: string; //DEFAULT
    nombre_oferta: string; //YA
    descripcion: string; //YA
    fecha_ini_oferta: string; //YA
    fecha_fin_oferta: string; //YA
    dias_semana: Weekday;
    hora_ini:  HHMM | HHMMSS; //YA
    hora_fin:  HHMM | HHMMSS; //YA
    creada_por: string;  //DEFAULT
    canal_oferta: canal; //YA
    status_oferta:string; //DEFAULT
        alcances: IAlcanceOferta[];
        reglas: IReglasOferta[];
        usos: IUsoOferta[];
}

export interface ICreateOrUpdateOferta{
    nombre_oferta: string;
    descripcion: string,
    fecha_ini_oferta: string;
    fecha_fin_oferta: string;
    dias_semana:string;
    hora_ini:  HHMM | HHMMSS;
    hora_fin:  HHMM | HHMMSS;
    creada_por: string;
    canal_oferta: canal;
    status_oferta:string;
        alcances: IAlcanceOferta[];
        reglas: IReglasOferta[];
}



