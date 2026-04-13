import fs from 'fs';
import path from 'path';
import { ConceptoFacturacion, FacturacionRepository } from '../repositories/Facturacion.repository';

// Carpeta donde se guardan los .txt para el sistema de facturación
const RUTA_FACTURACION = process.env.RUTA_FACTURACION ?? path.join(__dirname, '../../../../facturacion');

function fmt4(n: number): string { return n.toFixed(4); }
function fmt2(n: number): string { return n.toFixed(2); }

function buildDescripcionConcepto(c: ConceptoFacturacion): string {
    let desc = c.descripcion;

    if (c.lotes?.length) {
        const lotesStr = c.lotes
            .map(l => `Lote:${l.lote} Fec/Cad: ${l.fecha_venci} Pzas: ${fmt4(l.cantidad).padStart(13, ' ')}`)
            .join(' ');
        desc += ` - ${lotesStr}`;
    }

    // Añadir % IVA al final si tiene tasa > 0
    if (c.tasa_iva > 0) {
        desc += ` ${(c.tasa_iva * 100).toFixed(2)}%`;
    }

    return desc;
}

export const FacturacionService = {

    generarTxt: async (id_pedido_alm: string, id_empresa: string): Promise<{ ruta: string; folio: number }> => {

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        // ── Cálculos de totales ───────────────────────────────────────────
        const subtotal = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
        const totalTraslados = conceptos.reduce((s, c) => s + c.subtotal_linea * c.tasa_iva, 0);
        const totalNeto = subtotal + totalTraslados;

        // Agrupación de impuestos por tasa para [IMPUESTOS_TRASLADADOS]
        const mapaImpuestos = new Map<number, { subtotalTasa: number; importeIva: number }>();
        for (const c of conceptos) {
            const entry = mapaImpuestos.get(c.tasa_iva) ?? { subtotalTasa: 0, importeIva: 0 };
            entry.subtotalTasa += c.subtotal_linea;
            entry.importeIva += +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            mapaImpuestos.set(c.tasa_iva, entry);
        }

        const folio = cab.siguiente_folio;
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        // ── Construcción del .txt ─────────────────────────────────────────
        const lineas: string[] = [];

        // DATOS_EMISOR
        lineas.push('[DATOS_EMISOR]');
        lineas.push(`NOMBRE1: ${cab.nom_empre}`);
        lineas.push(`REGIMENFISCAL: ${cab.regimen_fiscal_empre}`);
        lineas.push(`RFC1: ${cab.rfc_empre}`);
        lineas.push('[/DATOS_EMISOR]');
        lineas.push('');

        // DATOS_RECEPTOR
        lineas.push('[DATOS_RECEPTOR]');
        lineas.push(`NOMBRE2: ${cab.razon_social_cliente}`);
        lineas.push(`RFC2: ${cab.rfc_cliente}`);
        lineas.push(`DOMICILIOFISCAL: ${cab.domicilio_fiscal}`);
        lineas.push(`REGIMENFISCAL2: ${cab.regimen_fiscal_cliente}`);
        lineas.push(`USOCFDI: ${cab.uso_cfdi}`);
        lineas.push('[/DATOS_RECEPTOR]');
        lineas.push('');

        // DATOS_CFD
        lineas.push('[DATOS_CFD]');
        lineas.push(`FOLIO: ${folio}`);
        lineas.push(`SERIE: ${cab.serie_facturacion_empre}`);
        lineas.push(`LUGAREXPEDICION: ${cab.lugar_expedicion}`);
        lineas.push('TIPO_COMPROBANTE: I');
        lineas.push(`FORMAPAGO: ${cab.forma_pago}`);
        lineas.push(`METODOPAGO: ${cab.metodo_pago}`);
        lineas.push('NUMCTAPAGO: ');
        lineas.push('DESCUENTO: 0.00');
        lineas.push('MOTIVODESCUENTO: _');
        lineas.push('MONEDA: MXN');
        lineas.push('TIPOCAMBIO: 1');
        lineas.push('TOTALRETENIDOS: 0.00');
        lineas.push(`TOTALTRASLADOS: ${fmt2(totalTraslados)}`);
        lineas.push(`SUBTOTAL: ${fmt2(subtotal)}`);
        lineas.push(`TOTALNETO: ${fmt2(totalNeto)}`);
        lineas.push(`LEYENDA: ${leyenda}`);
        lineas.push('OCULTAR_UUID: 1');
        lineas.push('VALIDEZ_OBLIGACIONES: 2');
        lineas.push('[/DATOS_CFD]');
        lineas.push('');

        // CONCEPTOS
        lineas.push('[CONCEPTOS]');
        lineas.push('C#: cve sat@unimed@des medi@c barras@Piezas@Descripcion de Articulo + lotes y caducidad como sus pzas@precio unt@descto@subtotal');
        conceptos.forEach((c, i) => {
            const desc = buildDescripcionConcepto(c);
            lineas.push(
                `C${i + 1}: ${c.cve_sat}@${c.sat_medida}@${c.desc_medida}@${c.cod_barras}` +
                `@${fmt4(c.cantidad)}@${desc}@${fmt2(c.precio_unitario)}@${fmt2(c.descuento)}@${fmt2(c.subtotal_linea)}`
            );
        });
        lineas.push('[/CONCEPTOS]');
        lineas.push('');

        // TRASLADADOS_CONCEPTOS
        lineas.push('[TRASLADADOS_CONCEPTOS]');
        lineas.push('TC#: C#@subtotal linea@CveTasa@Dest Tasa@% iva@imp IVA');
        conceptos.forEach((c, i) => {
            const importeIva = +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            lineas.push(
                `TC${i + 1}: C${i + 1}@${fmt2(c.subtotal_linea)}@${c.impuesto_sat}` +
                `@${c.tipo_factor}@${fmt2(c.tasa_iva)}@${fmt2(importeIva)}`
            );
        });
        lineas.push('[/TRASLADADOS_CONCEPTOS]');
        lineas.push('');

        // IMPUESTOS_TRASLADADOS
        lineas.push('[IMPUESTOS_TRASLADADOS]');
        lineas.push('IT#: Cve Tasa@% iva@Imp IVA@Subtotal tasa');
        let itIdx = 1;
        for (const [tasa, datos] of mapaImpuestos.entries()) {
            // tomamos el primer concepto con esta tasa para obtener impuesto_sat y tipo_factor
            const ref = conceptos.find(c => c.tasa_iva === tasa)!;
            lineas.push(
                `IT${itIdx++}: ${ref.impuesto_sat}@${ref.tipo_factor}@${fmt2(tasa)}` +
                `@${fmt2(datos.importeIva)}@${fmt2(datos.subtotalTasa)}`
            );
        }
        lineas.push('[/IMPUESTOS_TRASLADADOS]');

        // ── Escribir archivo ──────────────────────────────────────────────
        if (!fs.existsSync(RUTA_FACTURACION)) {
            fs.mkdirSync(RUTA_FACTURACION, { recursive: true });
        }

        const nombreArchivo = `${cab.serie_facturacion_empre}${folio}_${cab.cod_int_pedido_alm}.txt`;
        const rutaArchivo = path.join(RUTA_FACTURACION, nombreArchivo);
        fs.writeFileSync(rutaArchivo, lineas.join('\r\n'), 'latin1');

        // ── Registrar factura en BD ───────────────────────────────────────
        await FacturacionRepository.registrarFactura({
            folio,
            id_pedido_alm: cab.id_pedido_alm,
            id_cliente_alm: cab.id_cliente_alm,
            id_metodo_pago: cab.metodo_pago,
            id_forma_pago: cab.forma_pago,
            uso_cfdi: cab.uso_cfdi,
            subtotal: +fmt2(subtotal),
            iva: +fmt2(totalTraslados),
            conceptos,
        });

        return { ruta: rutaArchivo, folio };
    },
};
