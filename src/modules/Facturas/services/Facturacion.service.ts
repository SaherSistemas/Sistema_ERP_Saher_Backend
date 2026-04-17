import fs from 'fs';
import path from 'path';
import { Transaction } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { ConceptoFacturacion, FacturacionRepository } from '../repositories/Facturacion.repository';
import { RemisionRepository } from '../../Finanzas/Remisiones/repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../../Finanzas/Remisiones/repositories/Detalle_Remision.repository';
import { CxCRepository } from '../../Finanzas/Cuentas_Por_Cobrar/repositories/CxC.repository';

const RUTA_FACTURACION   = process.env.RUTA_FACTURACION ?? path.join(__dirname, '../../../../facturacion');
const RFC_PUBLICO_GENERAL = 'XAXX010101000';

// ─── helpers de formato ───────────────────────────────────────────────────────
function fmt4(n: number) { return n.toFixed(4); }
function fmt2(n: number) { return n.toFixed(2); }

function buildDescripcionConcepto(c: ConceptoFacturacion): string {
    let desc = c.descripcion;
    if (c.lotes?.length) {
        desc += ' - ' + c.lotes
            .map(l => `Lote:${l.lote} Fec/Cad: ${l.fecha_venci} Pzas: ${fmt4(l.cantidad).padStart(13, ' ')}`)
            .join(' ');
    }
    if (c.tasa_iva > 0) desc += ` ${(c.tasa_iva * 100).toFixed(2)}%`;
    return desc;
}

// ─── DTO de entrada ───────────────────────────────────────────────────────────
export interface IGenerarFacturaDTO {
    id_pedido_alm: string;
    id_empresa:    string;
    // dias_credito y cliente real se obtienen automáticamente del pedido y del cliente
}

export const FacturacionService = {

    generarTxt: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa } = dto;

        // ── 1. Obtener cabecera y conceptos (sin transacción aún) ─────────────
        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        // Días de crédito: vienen del perfil del cliente en la BD
        const dias_credito = Number(cab.plazo_pago_cliente ?? 0);

        // Cliente real: siempre el que está en el pedido (id_cliente_pedido_alm)
        const id_cliente_alm_real = cab.id_cliente_alm;

        // Factura de Público General: el RFC del cliente del pedido es XAXX
        const esPublicoGeneral = cab.rfc_cliente?.toUpperCase() === RFC_PUBLICO_GENERAL;

        // ── 2. Cálculos de totales ─────────────────────────────────────────────
        const subtotal       = conceptos.reduce((s, c) => s + c.subtotal_linea, 0);
        const totalTraslados = conceptos.reduce((s, c) => s + c.subtotal_linea * c.tasa_iva, 0);
        const totalNeto      = subtotal + totalTraslados;

        const mapaImpuestos  = new Map<number, { subtotalTasa: number; importeIva: number }>();
        for (const c of conceptos) {
            const entry = mapaImpuestos.get(c.tasa_iva) ?? { subtotalTasa: 0, importeIva: 0 };
            entry.subtotalTasa += c.subtotal_linea;
            entry.importeIva   += +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            mapaImpuestos.set(c.tasa_iva, entry);
        }

        const folio   = cab.siguiente_folio;
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        // ── 3. Construir el .txt ───────────────────────────────────────────────
        const lineas: string[] = [];

        lineas.push('[DATOS_EMISOR]');
        lineas.push(`NOMBRE1: ${cab.nom_empre}`);
        lineas.push(`REGIMENFISCAL: ${cab.regimen_fiscal_empre}`);
        lineas.push(`RFC1: ${cab.rfc_empre}`);
        lineas.push('[/DATOS_EMISOR]', '');

        lineas.push('[DATOS_RECEPTOR]');
        lineas.push(`NOMBRE2: ${cab.razon_social_cliente}`);
        lineas.push(`RFC2: ${cab.rfc_cliente}`);
        lineas.push(`DOMICILIOFISCAL: ${cab.domicilio_fiscal}`);
        lineas.push(`REGIMENFISCAL2: ${cab.regimen_fiscal_cliente}`);
        lineas.push(`USOCFDI: ${cab.uso_cfdi}`);
        lineas.push('[/DATOS_RECEPTOR]', '');

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
        lineas.push('[/DATOS_CFD]', '');

        lineas.push('[CONCEPTOS]');
        lineas.push('C#: cve sat@unimed@des medi@c barras@Piezas@Descripcion de Articulo + lotes y caducidad como sus pzas@precio unt@descto@subtotal');
        conceptos.forEach((c, i) => {
            lineas.push(
                `C${i + 1}: ${c.cve_sat}@${c.sat_medida}@${c.desc_medida}@${c.cod_barras}` +
                `@${fmt4(c.cantidad)}@${buildDescripcionConcepto(c)}@${fmt2(c.precio_unitario)}@${fmt2(c.descuento)}@${fmt2(c.subtotal_linea)}`
            );
        });
        lineas.push('[/CONCEPTOS]', '');

        lineas.push('[TRASLADADOS_CONCEPTOS]');
        lineas.push('TC#: C#@subtotal linea@CveTasa@Dest Tasa@% iva@imp IVA');
        conceptos.forEach((c, i) => {
            const importeIva = +(c.subtotal_linea * c.tasa_iva).toFixed(2);
            lineas.push(
                `TC${i + 1}: C${i + 1}@${fmt2(c.subtotal_linea)}@${c.impuesto_sat}` +
                `@${c.tipo_factor}@${fmt2(c.tasa_iva)}@${fmt2(importeIva)}`
            );
        });
        lineas.push('[/TRASLADADOS_CONCEPTOS]', '');

        lineas.push('[IMPUESTOS_TRASLADADOS]');
        lineas.push('IT#: Cve Tasa@% iva@Imp IVA@Subtotal tasa');
        let itIdx = 1;
        for (const [tasa, datos] of mapaImpuestos.entries()) {
            const ref = conceptos.find(c => c.tasa_iva === tasa)!;
            lineas.push(
                `IT${itIdx++}: ${ref.impuesto_sat}@${ref.tipo_factor}@${fmt2(tasa)}` +
                `@${fmt2(datos.importeIva)}@${fmt2(datos.subtotalTasa)}`
            );
        }
        lineas.push('[/IMPUESTOS_TRASLADADOS]');

        // ── 4. Escribir archivo ────────────────────────────────────────────────
        if (!fs.existsSync(RUTA_FACTURACION)) fs.mkdirSync(RUTA_FACTURACION, { recursive: true });
        const nombreArchivo = `${cab.serie_facturacion_empre}${folio}_${cab.cod_int_pedido_alm}.txt`;
        const rutaArchivo   = path.join(RUTA_FACTURACION, nombreArchivo);
        fs.writeFileSync(rutaArchivo, lineas.join('\r\n'), 'latin1');

        // ── 5. Transacción única: Factura + Remisión (si PG) + CxC (si crédito) ─
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            // 5a. Registrar factura y sus detalles
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                id_pedido_alm:  cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_metodo_pago: cab.metodo_pago,
                id_forma_pago:  cab.forma_pago,
                uso_cfdi:       cab.uso_cfdi,
                subtotal:       +fmt2(subtotal),
                iva:            +fmt2(totalTraslados),
                conceptos,
            }, t);

            let id_remision: string | null = null;

            // 5b. Siempre generar CxC (y Remisión si es PG)
            const fecha_vencimiento = new Date();
            fecha_vencimiento.setDate(fecha_vencimiento.getDate() + dias_credito);

            // Cliente real: PG → usa el mandado por el frontend; directo → del pedido
            const id_cliente_alm_cxc = esPublicoGeneral
                ? id_cliente_alm_real!
                : cab.id_cliente_alm;

            if (esPublicoGeneral) {
                // ── Flujo Público General: crear Remisión primero ──────────
                const folioRemision = await RemisionRepository.getUltimoFolio();

                const remision = await RemisionRepository.create({
                    id_factura:        factura.id_factura,
                    id_pedido_alm:     cab.id_pedido_alm,
                    id_cliente_alm:    id_cliente_alm_real!,
                    id_agente:         cab.id_agente_alm,
                    dias_credito,
                    subtotal_remision: +fmt2(subtotal),
                    iva_remision:      +fmt2(totalTraslados),
                    total_remision:    +fmt2(totalNeto),
                    notas:             null,
                }, folioRemision, t);

                // Detalles de la remisión = conceptos de la factura
                await Detalle_RemisionRepository.createMultiple(
                    remision.id_remision,
                    conceptos.map(c => ({
                        id_articulo:          null,
                        descripcion_articulo: c.descripcion,
                        cantidad:             c.cantidad,
                        precio_unitario:      c.precio_unitario,
                        subtotal:             c.subtotal_linea,
                        tasa_iva:             c.tasa_iva,
                        importe_iva:          +(c.subtotal_linea * c.tasa_iva).toFixed(2),
                    })),
                    t
                );

                id_remision = remision.id_remision;
            }

            // ── Crear CxC (para ambos flujos) ─────────────────────────────
            await CxCRepository.create({
                id_factura:        esPublicoGeneral ? null : factura.id_factura,
                id_remision:       id_remision,
                id_cliente_alm:    id_cliente_alm_cxc,
                monto_total:       +fmt2(totalNeto),
                fecha_vencimiento,
                dias_credito,
            }, t);

            await t.commit();

            return {
                ruta:             rutaArchivo,
                folio,
                id_factura:       factura.id_factura,
                flujo:            esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
                credito_generado: true,
                id_remision,
            };

        } catch (error) {
            await t.rollback();
            // Si la transacción falla, eliminar el .txt ya escrito
            if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
            throw error;
        }
    },
};
