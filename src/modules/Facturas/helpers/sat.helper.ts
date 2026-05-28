const SAT_UNIT_MAP: Record<string, string> = {
    PZA: 'H87', PZ:  'H87',
    KG:  'KGM', KGS: 'KGM', KILO:    'KGM',
    LT:  'LTR', LTS: 'LTR', LITRO:   'LTR',
    ML:  'MLT', MIL: 'MLT',
    MT:  'MTR', MTS: 'MTR', METRO:   'MTR',
    M2:  'MTK', M3:  'MTQ',
    GR:  'GRM', GRS: 'GRM',
    MG:  'MGM',
    CAJ: 'XBX', CAJA: 'XBX',
    PAQ: 'XPK', PAQUETE: 'XPK',
    JGO: 'SET',
    SRV: 'E48', SERV: 'E48', SERVICIO: 'E48',
    UNI: 'H87', UN:   'H87', UNIDAD:   'H87',
};

export function normalizarClaveUnidad(clave: string | null | undefined): string | null {
    if (!clave) return null;
    const upper = clave.trim().toUpperCase();
    return SAT_UNIT_MAP[upper] ?? clave.trim();
}

export function fmt4(n: number): string { return n.toFixed(4); }
export function fmt2(n: number): string { return n.toFixed(2); }
