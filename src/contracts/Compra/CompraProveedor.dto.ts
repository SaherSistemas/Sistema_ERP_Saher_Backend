// src/contracts/Compras/CompraProveedor.dto.ts
import { FechaISO, EstadoCompra } from './types';
import { ProveedorMiniDTO } from '../Proveedor/Provedor.dto';

// Respuesta principal (GET /compras_proveedor/:id, /porCompraGeneral/:id)
export type CompraProveedorDTO = {
    id_comp: string;
    idprove_comp: string;              // redundante, pero útil si lo necesitas
    id_compra_general: string;

    folio_factura_compra: string;

    total_comp_factura: number;
    total_iva_factura: number;
    total_comp_recibido: number;
    total_iva_recibido: number;
    costo_por_envio: number;

    estado_comp: EstadoCompra;

    // Fechas como ISO string
    inicio_de_compra_proveedor: FechaISO | null;
    fin_de_compra_proveedor: FechaISO | null;
    id_empleado_compra: string | null;
    fecha_enviada_proveedor: FechaISO | null;

    inicio_de_registro_lotes: FechaISO | null;
    fin_de_registro_lotes: FechaISO | null;

    proveedor: ProveedorMiniDTO;       // o ProveedorDTO si quieres todo
};

// Para crear (POST /compras_proveedor)
export type CreateCompraProveedorDTO = {
    idprove_comp: string;
    id_compra_general: string;
    folio_factura_compra: string;

    total_comp_factura: number;
    total_iva_factura: number;
    total_comp_recibido: number;
    total_iva_recibido: number;
    costo_por_envio: number;

    estado_comp?: EstadoCompra;

    inicio_de_compra_proveedor?: FechaISO | null;
    fin_de_compra_proveedor?: FechaISO | null;
    id_empleado_compra?: string | null;
};

// Para actualizar (PATCH /compras_proveedor/:id)
export type UpdateCompraProveedorDTO = Partial<Omit<CompraProveedorDTO,
    'id_comp' | 'proveedor' | 'id_compra_general'>> & {
        idprove_comp?: string; // permitir reasignar proveedor
    };
