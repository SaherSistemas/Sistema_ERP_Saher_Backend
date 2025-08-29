import { EmpresaMiniDTO } from "../Empresa_Sucursal/Empresa_Sucursal.dto";
import { EstadoCompraGeneral, FechaISO } from "./types";

// Respuesta principal (GET /compras_proveedor/:id, /porCompraGeneral/:id)
export type CompraGeneralDTO = {
    id_compra_general: string;
    id_interno_compra_gen: string;             
    fecha_inicio: FechaISO | null;
    fecha_fin_captura: FechaISO | null;
    fecha_completa_fin: FechaISO | null;
    estado_comp: EstadoCompraGeneral
    total_compra_general: number;
    total_iva_compra_general: number;

    total: number;

    id_empresa_sucursal: string | null; //EMPRESA
    ultimo_articulo_guardado: string | null;
    tipo_compra: string | null; //TYPE

};