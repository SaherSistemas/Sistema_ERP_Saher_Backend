import { XMLParser } from 'fast-xml-parser';

// Lectura de un CFDI (XML 3.3 / 4.0) de una factura de proveedor. Solo se leen los datos que la captura
// de compras necesita; no se valida el sello ni se consulta al SAT.

export interface ConceptoCfdi {
    indice: number;
    claveProdServ: string;
    noIdentificacion: string;       // código del artículo en el sistema del proveedor
    descripcion: string;
    cantidad: number;
    claveUnidad: string;
    unidad: string;
    valorUnitario: number;          // antes de descuento e IVA
    importe: number;
    descuento: number;              // monto del descuento del renglón
    descuentoPct: number;           // descuento / importe * 100
    ivaPct: number;                 // tasa de IVA trasladado en % (16, 8, 0). 0 si es exento o sin IVA
    importeIva: number;
}

export interface CfdiLeido {
    version: string;
    tipoComprobante: string;        // I = ingreso, E = egreso, P = pago, T = traslado
    serie: string;
    folio: string;
    folioCompleto: string;          // serie + folio
    fecha: string;                  // YYYY-MM-DD
    uuid: string;
    moneda: string;
    subtotal: number;
    descuento: number;
    total: number;
    rfcEmisor: string;
    nombreEmisor: string;
    rfcReceptor: string;
    conceptos: ConceptoCfdi[];
}

const num = (v: any): number => {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
};
const txt = (v: any): string => String(v ?? '').trim();
const arr = <T>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

export function leerCfdi(xml: string): CfdiLeido {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        removeNSPrefix: true,
        parseAttributeValue: false,
        parseTagValue: false,
        trimValues: true,
    });

    let raiz: any;
    try {
        raiz = parser.parse(xml);
    } catch {
        throw new Error('El XML no se pudo leer: el archivo no es un XML válido.');
    }

    const c = raiz?.Comprobante;
    if (!c) throw new Error('El XML no es un CFDI (no se encontró el nodo Comprobante).');

    const conceptosRaw = arr<any>(c.Conceptos?.Concepto);
    if (conceptosRaw.length === 0) throw new Error('El CFDI no trae conceptos.');

    const conceptos: ConceptoCfdi[] = conceptosRaw.map((k, i) => {
        const cantidad = num(k.Cantidad);
        const valorUnitario = num(k.ValorUnitario);
        const importe = num(k.Importe) || cantidad * valorUnitario;
        const descuento = num(k.Descuento);

        // IVA trasladado del concepto (impuesto 002). Si hay varios traslados se toma el de IVA.
        const traslados = arr<any>(k.Impuestos?.Traslados?.Traslado);
        const iva = traslados.find(t => txt(t.Impuesto) === '002');
        const ivaPct = iva && txt(iva.TipoFactor) !== 'Exento' ? Math.round(num(iva.TasaOCuota) * 10000) / 100 : 0;

        return {
            indice: i,
            claveProdServ: txt(k.ClaveProdServ),
            noIdentificacion: txt(k.NoIdentificacion),
            descripcion: txt(k.Descripcion),
            cantidad,
            claveUnidad: txt(k.ClaveUnidad),
            unidad: txt(k.Unidad),
            valorUnitario,
            importe,
            descuento,
            descuentoPct: importe > 0 ? Math.round((descuento / importe) * 10000) / 100 : 0,
            ivaPct,
            importeIva: iva ? num(iva.Importe) : 0,
        };
    });

    const timbre = c.Complemento?.TimbreFiscalDigital;
    const serie = txt(c.Serie);
    const folio = txt(c.Folio);

    return {
        version: txt(c.Version) || txt(c.version),
        tipoComprobante: txt(c.TipoDeComprobante),
        serie,
        folio,
        folioCompleto: `${serie}${serie && folio ? '-' : ''}${folio}`,
        fecha: txt(c.Fecha).slice(0, 10),
        uuid: txt(timbre?.UUID).toUpperCase(),
        moneda: txt(c.Moneda) || 'MXN',
        subtotal: num(c.SubTotal),
        descuento: num(c.Descuento),
        total: num(c.Total),
        rfcEmisor: txt(c.Emisor?.Rfc).toUpperCase(),
        nombreEmisor: txt(c.Emisor?.Nombre),
        rfcReceptor: txt(c.Receptor?.Rfc).toUpperCase(),
        conceptos,
    };
}
