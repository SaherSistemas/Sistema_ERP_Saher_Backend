// src/modules/Inventario/Ubicaciones/interface/Ubicacion.dto.ts
import { TipoUbicacion } from "../model/Ubicacion_Sucursal";

export interface ICrearUbicacionDTO {
    id_empresa_sucursal: string; // ideal: viene del token
    tipo_ubicacion: TipoUbicacion;

    // TARIMA
    tarima_ub?: string | null;

    // ESTANTERIA
    pasillo_ub?: string | null;
    anaquel_ub?: string | null;
    nivel_ub?: string | null;
    posicion_ub?: string | null;
}



//DTO 
export type UbicacionSucursalDTO = {
    id_ubicacion_sucursal: string;
    pasillo_ub?: string | null;
    anaquel_ub?: string | null;
    nivel_ub?: string | null;
    posicion_ub?: string | null;
    nombre?: string | null; // si lo tienes calculado o guardado
};



//TYPE 
export type GetAllFilters = {
    tipo?: string;          // ESTANTERIA | TARIMA
    pasillo?: string;       // A, B, ...
    anaquel?: string;       // 01, 02 ...
    q?: string;             // texto libre opcional (A-01 etc)
    include_defaults?: boolean;
};