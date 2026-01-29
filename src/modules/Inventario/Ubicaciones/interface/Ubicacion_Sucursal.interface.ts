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


    cod_barr_artic: string; // para asignar artículo a la ubicación
}
