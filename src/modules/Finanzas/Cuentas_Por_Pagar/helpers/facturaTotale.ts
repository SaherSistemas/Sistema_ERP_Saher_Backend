export interface TotalesFactura {
    subtotal: number;
    iva: number;
    total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcularTotalesFactura(
    detalles: any[],
    options?: {
        usarCantidad?: 'FACTURADA' | 'RECIBIDA' | 'NEGADA';
    }
): TotalesFactura {
    const usarCantidad = options?.usarCantidad ?? 'FACTURADA';

    let subtotal = 0;
    let iva = 0;

    for (const d of detalles) {
        const precioUnitario = Number(d.precio_articulo_factura ?? 0);
        // Si iva_articulo_factura es null/undefined se asume 0 (sin IVA), igual que recalcularTotales
        const ivaPct = Number(d.iva_articulo_factura ?? 0);
        const descPct = Number(d.descuento_articulo_factura ?? 0);

        let cantidad = 0;
        if (usarCantidad === 'FACTURADA') cantidad = Number(d.cantidad_articulo_facturada ?? 0);
        if (usarCantidad === 'RECIBIDA') cantidad = Number(d.resumen?.recibido ?? 0);
        if (usarCantidad === 'NEGADA') cantidad = Number(d.resumen?.negado ?? 0);

        const neto = precioUnitario * cantidad * (1 - descPct / 100);
        const ivaLinea = neto * (ivaPct / 100);

        subtotal += neto;
        iva += ivaLinea;
    }

    return {
        subtotal: round2(subtotal),
        iva: round2(iva),
        total: round2(subtotal + iva),
    };
}