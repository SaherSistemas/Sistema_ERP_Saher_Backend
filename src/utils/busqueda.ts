/**
 * Patrón para ILIKE de una búsqueda de texto: los espacios son comodines (%).
 *   "paracetamol alpharma"  →  "%paracetamol%alpharma%"
 * Así se encuentra "PARACETAMOL 500MG TAB (ALPHARMA)" aunque entre las palabras haya otras.
 * Si el usuario ya escribió % se respeta tal cual.
 */
export function patronBusqueda(texto: string | null | undefined): string {
    const limpio = String(texto ?? '').trim().replace(/\s+/g, '%');
    return `%${limpio}%`.replace(/%{2,}/g, '%');
}
