import type { CompraProveedorDTO } from '../../../../contracts/Compra/CompraProveedor.dto';
import { makeMapper, asNum, asISO } from '../../../../utils/mapperGenerico';

export const mapCompraProveedor = makeMapper<any, CompraProveedorDTO>(
    {
        // id_comp: puede venir directo (Compra_Proveedor) o por FK de factura
        id_comp: (s: any) => s?.id_comp ?? s?.compra?.id_comp ?? s?.id_compra_prove_factura ?? null,

        // folio: Compra_Proveedor usa folio_factura_compra; Factura usa folio_factura_proveedor
        folio_factura_compra: (s: any) => s?.folio_factura_compra ?? s?.folio_factura_proveedor ?? null,

        // Totales: cuando viene de factura usa sus propios campos; si viene de compra usa los de compra
        total_comp_factura: (s: any) => asNum(s?.total_comp_factura ?? s?.total_factura_proveedor ?? s?.compra?.total_comp_factura),
        total_iva_factura: (s: any) => asNum(s?.total_iva_factura ?? s?.compra?.total_iva_factura),
        total_comp_recibido: (s: any) => asNum(s?.total_recibido_factura ?? s?.total_comp_recibido ?? s?.compra?.total_comp_recibido),
        total_iva_recibido: (s: any) => asNum(s?.total_iva_recibido_factura ?? s?.total_iva_recibido ?? s?.compra?.total_iva_recibido),
        costo_por_envio: { from: 'costo_por_envio', map: asNum },

        inicio_de_compra_proveedor: { from: 'inicio_de_compra_proveedor', map: asISO },
        fin_de_compra_proveedor: { from: 'fin_de_compra_proveedor', map: asISO },
        fecha_enviada_proveedor: { from: 'fecha_enviada_proveedor', map: asISO },
        inicio_de_registro_lotes: { from: 'inicio_de_registro_lotes', map: asISO },
        fin_de_registro_lotes: { from: 'fin_de_registro_lotes', map: asISO },

        // Proveedor: puede venir directo o anidado en compra
        proveedor: (s: any) => {
            const p = s?.proveedor ?? s?.compra?.proveedor ?? null;
            return {
                id_prove: p?.id_prove ?? null,
                nomcort_prove: p?.nomcort_prove ?? null,
                razsoc_prove: p?.razsoc_prove ?? null,
                rfc_prove: p?.rfc_prove ?? null,
            };
        },
    },
    { autoCopy: true }
);

