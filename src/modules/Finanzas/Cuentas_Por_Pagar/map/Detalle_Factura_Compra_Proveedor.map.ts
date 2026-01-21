// modules/Finanzas/Cuentas_Por_Pagar/maps/Detalle_Factura_Compra_Proveedor.map.ts
/*
import { IDetalleFacturaCompraProveedor, IDetalleFacturaCompraProveedorDTO } from '../interface/Detalle_Factura_Compra_Proveedor.interface';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';

export const DetalleFacturaCompraProveedorMap = {
    toBase(dto: Detalle_Factura_Compra_Proveedor): IDetalleFacturaCompraProveedor {
        return {
            id_factura_proveedor_detalle: dto.id_factura_proveedor_detalle,
            id_factura_compra_proveedor: dto.id_factura_compra_proveedor,
            id_articulo: dto.id_articulo,
            cantidad_facturada: Number(dto.cantidad_facturada),
            costo_unitario: Number(dto.costo_unitario),
            iva_unitario: Number(dto.iva_unitario),
            ieps_unitario: Number(dto.ieps_unitario),
            descuento_unitario: Number(dto.descuento_unitario),
            subtotal_unitario: Number(dto.subtotal_unitario),
        };
    },

    toDTO(dto: Detalle_Factura_Compra_Proveedor): IDetalleFacturaCompraProveedorDTO {
        const base = this.toBase(dto);

        return {
            ...base,
            articulo: dto.articulo
                ? {
                    id_articulo: dto.articulo.id_artic,
                    cod_barras: (dto.articulo as any).cod_barras ?? undefined,
                    nombre_articulo: (dto.articulo as any).nombre_articulo ?? undefined,
                    clave_interna: (dto.articulo as any).clave_interna ?? undefined,
                }
                : undefined,
        };
    },

    toDTOList(list: Detalle_Factura_Compra_Proveedor[]): IDetalleFacturaCompraProveedorDTO[] {
        return list.map((item) => this.toDTO(item));
    },
};
*/