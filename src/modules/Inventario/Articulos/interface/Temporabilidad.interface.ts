export interface ITemporabilidad {
    id_tempo: number,
    descrip_tempo: string,
    mesinicio_tempo: number,
    mesfin_tempo: number,
}

export interface ICreateOrUpdateTemporabilidad {
    descrip_tempo: string;
    mesinicio_tempo: number;
    mesfin_tempo: number
}