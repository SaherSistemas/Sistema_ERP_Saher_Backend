// Margen (en pesos) con el que una factura de proveedor se considera cuadrada: recibido + notas de crédito + ajustes
// contra el total de la factura. Las diferencias de centavos vienen de redondeos (IVA, descuentos, cálculos del
// proveedor) y no deben dejar la factura en "Pendientes Devoluciones".
export const TOLERANCIA_CUADRE_FACTURA = 2;

// ¿La diferencia entre el total de la factura y lo cubierto cae dentro del margen? (en centavos, para no arrastrar decimales)
export function cuadraConTolerancia(totalFactura: number, totalCubierto: number): boolean {
    const dif = Math.abs(Math.round(Number(totalFactura) * 100) - Math.round(Number(totalCubierto) * 100));
    return dif <= Math.round(TOLERANCIA_CUADRE_FACTURA * 100);
}
