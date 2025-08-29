//DONDE Y A QUE SE LE APLCIA LA OFERTA
export interface IAlcanceOferta{
    id_alcance: string;
    id_oferta: string;
    tipo_alcance: string; 
    id_referencia: string | null; 
}

export interface ICreateOrUpdateAlcanceOferta{
    id_oferta: string;
    tipo_alcance: string; //
    id_referencia: string | null; 

}

