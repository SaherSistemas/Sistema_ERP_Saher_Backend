//DONDE Y A QUE SE LE APLCIA LA OFERTA
export interface IAlcanceOferta{
    id_alcance: string;
    id_oferta: string;
    tipo_alcance: string; // ej. 'EMPRESA' | 'SUCURSAL' | 'PRODUCTO' | 
    id_referencia: string | null; // id de la entidad (UUID) o null según el tipo    //nuevas
    nivel_aplicacion: string; //"ITEM" | "TICKET" | "BUNDLE"
    modo_alcance:string ; //"INCLUDE" | "EXCLUDE"
    prioridad_alcance?: number; //Para romper empates cuando coinciden múltiples alcances.
    activo:boolean; //Habilitar/deshabilitar sin borrar.
}

export interface ICreateOrUpdateAlcanceOferta{
    id_oferta: string;
    tipo_alcance: string; // ej. 'EMPRESA' | 'SUCURSAL' | 'PRODUCTO' | 
    id_referencia: string | null; // id de la entidad (UUID) o null según el tipo
    nivel_aplicacion: string; //"ITEM" | "TICKET" | "BUNDLE"
    modo_alcance:string ; //"INCLUDE" | "EXCLUDE"
    prioridad_alcance?: number; //Para romper empates cuando coinciden múltiples alcances.
    activo:boolean; //Habilitar/deshabilitar sin borrar.
}


//EJEMPLO
// [
//   {
//     "id_oferta": "OF-A",
//     "tipo_alcance": "EMPRESA", //la oferta aplica a todo el catálogo de esa empresa.
//     "id_referencia": "EMP-UUID",
//     "nivel_aplicacion": "ITEM",
//     "modo_alcance": "INCLUDE",
//     "activo": true
//   },
//   {
//     "id_oferta": "OF-A",
//     "tipo_alcance": "CATEGORIA",
//     "id_referencia": "CAT-CABELLO",
//     "nivel_aplicacion": "ITEM",
//     "modo_alcance": "EXCLUDE",// se excluye la categoría Cabello y toda su sub-rama (Shampoo, Acondicionador, etc.).
//     "include_descendientes": true,
//     "activo": true
//   }
// ]
