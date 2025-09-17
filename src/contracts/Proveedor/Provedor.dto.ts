// src/contracts/Proveedores/Proveedor.dto.ts
import { FechaISO } from '../Compra/types';

export type ProveedorDTO = {
    id_prove: string;
    nomcort_prove: string;
    razsoc_prove: string;
    rfc_prove: string;
    calle_prove: string;
    id_colonia_prove: string;
    telef_prove: string;
    corr_prove: string;
    diascre_prove: number;
    limicre_prove: number;
    activo_prove: boolean;
    plazoentrega_prove: string;
    num_entregas_prove: number;
    ctabanca_prove: string;
    condpago_prove: string;
    createdAt?: FechaISO;
    updatedAt?: FechaISO;
};

// Versión “mini” para anidar en otros DTOs (recomendada en listados)
export type ProveedorMiniDTO = {
    id_prove: string;
    nomcort_prove: string;
    razsoc_prove: string;
    rfc_prove: string;
};
