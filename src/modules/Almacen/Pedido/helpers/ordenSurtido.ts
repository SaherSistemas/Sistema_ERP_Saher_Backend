// Orden en que se recorre el almacén al surtir: pasillos 1A, A, B, C, D, E, F, G, H, R; después cualquier otro pasillo,
// lo que no tiene ubicación y, al final, las tarimas. Dentro del pasillo: anaquel, nivel y posición en orden numérico.
const RANGO_PASILLO: Record<string, number> = {
    '1A': 1, 'A1': 1,            // "A1" era como estaba escrito el primer pasillo en el orden anterior
    'A': 2, 'B': 3, 'C': 4, 'D': 5, 'E': 6, 'F': 7, 'G': 8, 'H': 9, 'H1': 9.5, 'R': 10,
};
const RANGO_OTRO_PASILLO = 11;
const RANGO_SIN_UBICACION = 12;
const RANGO_TARIMA = 13;

export interface UbicacionSurtido {
    pasillo?: string | null;
    anaquel?: string | number | null;
    nivel?: string | number | null;
    posicion?: string | number | null;
    tarima?: string | null;
}

export function rangoUbicacionSurtido(u: UbicacionSurtido | null | undefined): number {
    if (!u) return RANGO_SIN_UBICACION;
    if (String(u.tarima ?? '').trim()) return RANGO_TARIMA;
    const pasillo = String(u.pasillo ?? '').trim().toUpperCase();
    return RANGO_PASILLO[pasillo] ?? RANGO_OTRO_PASILLO;
}

export function compararUbicacionesSurtido(ua: UbicacionSurtido | null | undefined, ub: UbicacionSurtido | null | undefined): number {
    const ra = rangoUbicacionSurtido(ua);
    const rb = rangoUbicacionSurtido(ub);
    if (ra !== rb) return ra - rb;
    if (!ua || !ub) return 0;
    // Dos pasillos que no están en la lista: por nombre
    if (ra === RANGO_OTRO_PASILLO) {
        const c = String(ua.pasillo ?? '').localeCompare(String(ub.pasillo ?? ''), 'es', { numeric: true });
        if (c !== 0) return c;
    }
    // Dos tarimas: por número de tarima
    if (ra === RANGO_TARIMA) return String(ua.tarima ?? '').localeCompare(String(ub.tarima ?? ''), 'es', { numeric: true });
    const num = (v: unknown) => parseInt(String(v ?? ''), 10) || 0;
    return (num(ua.anaquel) - num(ub.anaquel)) || (num(ua.nivel) - num(ub.nivel)) || (num(ua.posicion) - num(ub.posicion));
}
