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
        ivaPorcentajeDefault?: number;
    }
): TotalesFactura {
    /*console.log(
        "DETALLES CON LOTES:",
        JSON.stringify(detalles, null, 2)
    );*/
    const usarCantidad = options?.usarCantidad ?? 'FACTURADA';
    const ivaDefault = options?.ivaPorcentajeDefault ?? 16;

    let subtotal = 0;
    let iva = 0;

    for (const d of detalles) {
        const precioUnitario = Number(d.precio_articulo_factura ?? 0);
        const ivaPct = Number(d.iva_articulo_factura ?? ivaDefault);

        let cantidad = 0;
        if (usarCantidad === 'FACTURADA') cantidad = Number(d.cantidad_articulo_facturada ?? 0);
        if (usarCantidad === 'RECIBIDA') cantidad = Number(d.resumen?.recibido ?? 0);
        if (usarCantidad === 'NEGADA') cantidad = Number(d.resumen?.negado ?? 0);

        const sub = precioUnitario * cantidad;
        const ivaLinea = sub * (ivaPct / 100);

        subtotal += sub;
        iva += ivaLinea;
    }

    return {
        subtotal: round2(subtotal),
        iva: round2(iva),
        total: round2(subtotal + iva),
    };
}