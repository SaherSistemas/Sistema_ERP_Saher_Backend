// ¿El código leído en el chequeo corresponde al código de barras del catálogo?
// Solo se toleran las diferencias reales de captura del lector o del catálogo:
//   · mayúsculas/minúsculas y espacios alrededor
//   · ceros a la izquierda (UPC-12 contra EAN-13)
//   · un dígito verificador de más o de menos en códigos largos (8 dígitos o más)
// Si hay un artículo con el código exacto, solo cuenta ese: la tolerancia solo se usa cuando no hay exacto.
// Un número cualquiera (5, 750…), un pedazo del código o un código con signos (-, +, *, espacios) NO coincide.
export function coincideCodigoBarras(catalogo: string | null | undefined, leido: string | null | undefined): boolean {
    const a = String(catalogo ?? '').trim();
    const b = String(leido ?? '').trim();
    if (!a || !b) return false;
    // Un código solo lleva letras y números: con cualquier signo no es un código
    if (!/^[A-Za-z0-9]+$/.test(b)) return false;

    if (a.toLowerCase() === b.toLowerCase()) return true;

    const sa = a.replace(/^0+/, '').toLowerCase();
    const sb = b.replace(/^0+/, '').toLowerCase();
    if (sa && sa === sb) return true;

    if (sa.length >= 8 && sb.length >= 8 && Math.abs(sa.length - sb.length) === 1) {
        const [corto, largo] = sa.length < sb.length ? [sa, sb] : [sb, sa];
        if (largo.startsWith(corto)) return true;
    }
    return false;
}

const esExacto = (catalogo: string | null | undefined, leido: string | null | undefined): boolean =>
    String(catalogo ?? '').trim().toLowerCase() === String(leido ?? '').trim().toLowerCase() && !!String(leido ?? '').trim();

// De los artículos que trajo la búsqueda, los que de verdad corresponden al código leído
export function filtrarPorCodigoBarras<T extends { cod_barr_artic?: string | null }>(articulos: T[], leido: string): T[] {
    const validos = articulos.filter(a => coincideCodigoBarras(a.cod_barr_artic, leido));
    const exactos = validos.filter(a => esExacto(a.cod_barr_artic, leido));
    return exactos.length ? exactos : validos;
}
