import type { CompraProveedorDTO } from '../../../../contracts/Compra/CompraProveedor.dto';
import { makeMapper, asNum, asISO } from '../../../../utils/mapperGenerico';

export const mapCompraProveedor = makeMapper<any, CompraProveedorDTO>(
    {
        // EXCEPCIONES: DECIMAL→number, Date→ISO, anidados...
        total_comp_factura: { from: 'total_comp_factura', map: asNum },
        total_iva_factura: { from: 'total_iva_factura', map: asNum },
        total_comp_recibido: { from: 'total_comp_recibido', map: asNum },
        total_iva_recibido: { from: 'total_iva_recibido', map: asNum },
        costo_por_envio: { from: 'costo_por_envio', map: asNum },

        inicio_de_compra_proveedor: { from: 'inicio_de_compra_proveedor', map: asISO },
        fin_de_compra_proveedor: { from: 'fin_de_compra_proveedor', map: asISO },
        fecha_enviada_proveedor: { from: 'fecha_enviada_proveedor', map: asISO },
        inicio_de_registro_lotes: { from: 'inicio_de_registro_lotes', map: asISO },
        fin_de_registro_lotes: { from: 'fin_de_registro_lotes', map: asISO },

        proveedor: (s: any) => ({
            id_prove: s?.proveedor?.id_prove,
            nomcort_prove: s?.proveedor?.nomcort_prove ?? null,
            razsoc_prove: s?.proveedor?.razsoc_prove ?? null,
            rfc_prove: s?.proveedor?.rfc_prove ?? null,
        }),
    },
    { autoCopy: true } // ← todo lo que se llame igual se copia solo
);

