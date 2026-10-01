// No exige nibbles de versión/variante RFC4122 ([1-5] y [89ab]) a propósito: muchos ids de
// este catálogo (importados/migrados de sistemas viejos) tienen forma de UUID pero no son
// estrictamente compliant — ej. un id_artic real con "7c8d" donde RFC4122 pediría [89ab]. Con
// la regex estricta, isUUID() los rechazaba, getByIDFlexible() los trataba como código de barras
// en vez de buscarlos por llave primaria, y el lookup fallaba con "artículo no encontrado"
// aunque el artículo sí existiera.
export const isUUID = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}


export const num = (x: any) => (x == null ? 0 : Number(x))


export const round2 = (n: unknown) => Math.round(Number(n ?? 0) * 100) / 100;