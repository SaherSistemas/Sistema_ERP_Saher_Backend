import fs from 'fs';
import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal, dbPoly } from '../../../config/db';
import { FacturacionRepository } from '../repositories/Facturacion.repository';
import { ConceptoFacturacion } from '../interfaces/Facturacion.types';
import {
    IGenerarFacturaDTO,
    IDetalleEgresoDTO,
    ITimbrarEgresoDTO,
    ITimbrarPagoDTO,
} from '../interfaces/Facturacion.dto';
import { RUTA_FACTURACION, RUTA_PDFS } from '../helpers/pdf.helper';
import { generarTrasladoPDFBuffer } from '../helpers/traslado.pdf';
import { generarTraspasoCompletoPDFBuffer, TraspasoItem } from '../helpers/traspaso.pdf';
import { fmt2, fmt4 } from '../helpers/sat.helper';
import {
    generarTxtIngreso,
    generarTxtEgreso,
    generarTxtPago,
    derivarSeries,
    ConceptoTxt,
    EmisorTxt,
    ReceptorTxt,
} from '../helpers/cfdi_txt.helper';
import {
    RFC_PUBLICO_GENERAL,
    detectarPublicoGeneral,
    buildDescripcionConcepto,
    calcularTotales,
    particionarConceptos,
    crearCxCyRemision,
    calcularImpuestosProporcionalesPago,
} from '../helpers/factura.helper';
import { parseCfdiXml, generarPdfDesdeCfdi } from '../helpers/cfdi-xml-to-pdf.helper';
import Facturas from '../model/Facturas.model';
import Detalle_Factura from '../model/Detalle_Factura.model';
import Cuenta_Por_Cobrar from '../../Finanzas/Cuentas_Por_Cobrar/model/Cuenta_Por_Cobrar.model';
import Remision from '../../Finanzas/Remisiones/model/Remision.model';
import { RemisionRepository } from '../../Finanzas/Remisiones/repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../../Finanzas/Remisiones/repositories/Detalle_Remision.repository';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Trabajo_Impresion from '../../Impresiones/model/Trabajo_Impresion';
import Impresora from '../../Impresiones/model/Impresora';
import FacturaPagoCFDI from '../model/Factura_Pago_CFDI.model';
import { Stock_Ubicacion_LoteRepository } from '../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import Stock_Ubicacion_Lote from '../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Kardex_Movimientos_Articulos from '../../Almacen/Kardex/model/Kardex_Movimientos_Articulos';
import Cat_Status_Pedido_Almacen from '../../Almacen/Pedido/model/Cat_Status_Pedido_Almacen';
import { Kardex_Movimiento_ArticuloRepository } from '../../Almacen/Kardex/repositories/Kardex_Movimiento_Articulo.repository';
import EmpresaSucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor';
import Lote_Factura_Compra_Proveedor from '../../Finanzas/Cuentas_Por_Pagar/model/Lote_Factura_Compra_Proveedor';
import Cat_Bancos from '../../Catalogos/model/Cat_Bancos';
import { v4 as uuidv4 } from 'uuid';
import { UsuarioRepository } from '../../Seguridad/repositories/Usuario.repository';
import { checkPassword } from '../../../utils/hashPassword';

export { IGenerarFacturaDTO, IDetalleEgresoDTO, ITimbrarEgresoDTO, ITimbrarPagoDTO };

async function verificarAdmin(usuario_admin: string, password_admin: string): Promise<{ usuario: string; id_user: string | null }> {
    const usernameNorm = usuario_admin.trim().toLowerCase();

    // Permitir usuario maestro de .env
    if (
        process.env.MASTER_USER &&
        process.env.MASTER_PASSWORD &&
        usernameNorm === process.env.MASTER_USER.toLowerCase() &&
        password_admin === process.env.MASTER_PASSWORD
    ) return { usuario: usernameNorm, id_user: null };

    const usuario = await UsuarioRepository.usuarioPorUser(usernameNorm);
    if (!usuario) throw new Error('Credenciales de administrador incorrectas.');

    const ok = await checkPassword(password_admin, usuario.password_user);
    if (!ok) throw new Error('Credenciales de administrador incorrectas.');

    // Verificar que sea administrador (idrol_user = 1)
    if ((usuario as any).idrol_user !== 1) {
        throw new Error('El usuario no tiene permisos de administrador.');
    }

    return { usuario: (usuario as any).username ?? usernameNorm, id_user: (usuario as any).id_user ?? null };
}

// Arma el PDF de la hoja de traspaso (artículos por lote, con el folio de la factura del proveedor
// y el proveedor). Lo usan el traslado al facturar y el botón "Traspaso" de Facturas Emitidas.
async function construirPdfTraspaso(p: {
    cab: import('../interfaces/Facturacion.types').DatosFacturacionCabecera;
    conceptos: ConceptoFacturacion[];
    folio: number;
    fecha?: Date;
}): Promise<Buffer> {
    const { cab, conceptos, folio } = p;

    const itemsTraspaso: TraspasoItem[] = conceptos.map(c => ({
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        cod_int_artic: c.cod_int_artic,
        cod_barras: c.cod_barras,
        necesita_receta: c.necesita_receta,
        lotes: c.lotes.map(l => ({ ...l })),  // copia mutable para enriquecer con PolyDB
    }));

    // Enriquecer lotes sin factura local desde PolyDB (rme00102)
    for (const item of itemsTraspaso) {
        for (const lote of item.lotes) {
            if (!lote.folio_factura_proveedor && lote.fecha_venci) {
                try {
                    const [mm, yyyy] = lote.fecha_venci.split('/');
                    const mes = parseInt(mm, 10);
                    const anio = parseInt(yyyy, 10);
                    const fi = `${anio}-${String(mes).padStart(2, '0')}-01`;
                    const mn = mes === 12 ? 1 : mes + 1;
                    const an = mes === 12 ? anio + 1 : anio;
                    const ff = `${an}-${String(mn).padStart(2, '0')}-01`;
                    const sql = `SELECT rm.rmenufacc AS folio_factura, pr.prvrazonc AS razon_proveedor FROM rme00102 rm LEFT JOIN proveedores pr ON pr.prvcdprvn = rm.prvcdprvn WHERE rm.artcdartn = ${item.cod_int_artic} AND rm.empcdempn = 20 AND rm.rmefecadd >= '${fi}' AND rm.rmefecadd < '${ff}' LIMIT 1`;
                    const polyRows = await dbPoly.query<any>(sql, { type: QueryTypes.SELECT });
                    if (polyRows[0]) {
                        lote.folio_factura_proveedor = polyRows[0].folio_factura ? String(polyRows[0].folio_factura).trim() : null;
                        lote.nom_proveedor = polyRows[0].razon_proveedor ? String(polyRows[0].razon_proveedor).trim() : null;
                    }
                } catch (e) {
                    console.error('[TRASPASO-FAC] PolyDB error art', item.cod_int_artic, e);
                }
            }
        }
    }

    const fechaDoc = p.fecha ?? new Date();
    const fechaDocStr = `${String(fechaDoc.getDate()).padStart(2, '0')}/${String(fechaDoc.getMonth() + 1).padStart(2, '0')}/${String(fechaDoc.getFullYear()).slice(-2)}`;

    return await generarTraspasoCompletoPDFBuffer({
        folio, folio_interno: folio, fecha: fechaDocStr,
        cod_int_pedido: cab.cod_int_pedido_alm, ruta: null,
        razon_social: cab.razon_social_cliente, rfc_receptor: cab.rfc_cliente,
        calle_receptor: cab.calle_cliente, colonia_receptor: cab.colonia_cliente,
        municipio_receptor: cab.municipio_cliente, estado_receptor: cab.estado_cliente,
        cp_receptor: cab.domicilio_fiscal, telefono_receptor: null,
        nom_empre: cab.nom_empre, rfc_empre: cab.rfc_empre,
        calle_empre: null, colonia_empre: null, municipio_empre: null, estado_empre: null, cp_empre: null,
        nom_empre_receptor: cab.nom_empre_receptor ?? null,
    }, itemsTraspaso);
}

function fechaVenciToDate(fechaVenci: string): string {
    const [mes, anio] = (fechaVenci ?? '').split('/');
    if (!mes || !anio) return fechaVenci;
    return `${anio}-${String(mes).padStart(2, '0')}-01`;
}

async function getLotesPorPedido(id_pedido_alm: string): Promise<
    Map<string, { lote: string; fecha_caducidad: string; cantidad: number }[]>
> {
    const rows = await dbLocal.query<{
        id_articulo: string;
        numero_lote: string;
        fecha_caducidad: string;
        cantidad: number;
    }>(`
        SELECT
            dpa.id_articulo,
            COALESCE(dpal.lote_factura_numero, las.numero_lote_sucursal) AS numero_lote,
            TO_CHAR(COALESCE(dpal.lote_factura_fecha, las.fecha_venci_lote_sucursal)::date, 'YYYY-MM-DD') AS fecha_caducidad,
            dpal.cantidad
        FROM detalle_pedido_almacen     dpa
        JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
        JOIN lote_articulo_sucursal      las  ON las.id_lote_sucursal           = dpal.id_lote_sucursal
        WHERE dpa.id_pedido_almacen = :id_pedido_alm
          AND dpal.cantidad > 0
    `, { replacements: { id_pedido_alm }, type: QueryTypes.SELECT });

    const mapa = new Map<string, { lote: string; fecha_caducidad: string; cantidad: number }[]>();
    for (const r of rows) {
        const lista = mapa.get(r.id_articulo) ?? [];
        lista.push({ lote: r.numero_lote, fecha_caducidad: r.fecha_caducidad, cantidad: Number(r.cantidad) });
        mapa.set(r.id_articulo, lista);
    }
    return mapa;
}

// Nombre del emisor para .txt: usa nom_empre_facturacion si está configurado, si no nom_empre.
function nomEmisorTxt(nombreDb: string, nombreFacturacion: string | null): string {
    return nombreFacturacion?.trim() || nombreDb;
}

async function obtenerEmisor(id_empresa: string): Promise<EmisorTxt & {
    serie_facturacion_empre: string;
    num_cuenta_banco?: string | null;
    rfc_banco?: string | null;
} | null> {
    const e = await EmpresaSucursal.findByPk(id_empresa, {
        attributes: ['nom_empre', 'nom_empre_facturacion', 'rfc_empre', 'regimen_fiscal_empre', 'serie_facturacion_empre', 'id_colonia_empre', 'num_cuenta_banco', 'id_banco_empresa'],
        raw: true,
    }) as any;
    if (!e) return null;

    let rfc_banco: string | null = null;
    if (e.id_banco_empresa) {
        const banco = await Cat_Bancos.findByPk(e.id_banco_empresa, { raw: true }) as any;
        rfc_banco = banco?.rfc_banco?.trim() || null;
    }

    return {
        nom_empre: nomEmisorTxt(e.nom_empre, e.nom_empre_facturacion),
        rfc_empre: e.rfc_empre,
        regimen_fiscal_empre: e.regimen_fiscal_empre ?? '601',
        serie_ingreso: e.serie_facturacion_empre ?? 'FSH',
        lugar_expedicion: e.lugar_expedicion ?? '80160',
        serie_facturacion_empre: e.serie_facturacion_empre ?? 'FSH',
        num_cuenta_banco: e.num_cuenta_banco?.trim() || null,
        rfc_banco,
    };
}

export const FacturacionService = {

    // ── Genera .txt de Ingreso (timbrado manual con facturador externo) ───────
    generarTxt: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_empleado } = dto;

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        const dias_credito = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral = detectarPublicoGeneral(cab.rfc_cliente, cab.nom_empre_receptor);
        const folio = cab.siguiente_folio;
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const emisor: EmisorTxt = {
            nom_empre: nomEmisorTxt(cab.nom_empre, cab.nom_empre_facturacion),
            rfc_empre: cab.rfc_empre,
            regimen_fiscal_empre: cab.regimen_fiscal_empre,
            serie_ingreso: cab.serie_facturacion_empre,
            lugar_expedicion: cab.lugar_expedicion,
        };
        const receptor: ReceptorTxt = esPublicoGeneral ? {
            razon_social: 'VENTA AL PUBLICO EN GENERAL',
            rfc: RFC_PUBLICO_GENERAL,
            domicilio_fiscal: cab.lugar_expedicion,
            regimen_fiscal: '616',
            uso_cfdi: 'S01',
        } : {
            razon_social: cab.razon_social_cliente,
            rfc: cab.rfc_cliente,
            domicilio_fiscal: cab.domicilio_fiscal,
            regimen_fiscal: cab.regimen_fiscal_cliente,
            uso_cfdi: cab.uso_cfdi,
        };
        const conceptosTxt: ConceptoTxt[] = conceptos.map(c => ({
            cve_sat: c.cve_sat,
            sat_medida: c.sat_medida,
            desc_medida: c.desc_medida,
            cod_barras: c.cod_barras,
            cantidad: c.cantidad,
            descripcion: c.descripcion,
            precio_unitario: c.precio_unitario,
            descuento: c.descuento,
            subtotal_linea: c.subtotal_linea,
            tasa_iva: c.tasa_iva,
            impuesto_sat: c.impuesto_sat,
            tipo_factor: c.tipo_factor,
            lotes: c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
        }));

        const { ruta: rutaArchivo } = generarTxtIngreso({
            emisor, receptor, folio,
            forma_pago: cab.forma_pago,
            metodo_pago: cab.metodo_pago,
            conceptos: conceptosTxt,
            leyenda,
            nombreArchivo: `${cab.serie_facturacion_empre}${folio}_${cab.cod_int_pedido_alm}.txt`,
        });

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            const totales = calcularTotales(conceptos);

            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi: 'I',
                origen_factura: 'PED',
                id_pedido_alm: cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_empresa_facturas: id_empresa ?? null,
                id_metodo_pago: cab.metodo_pago,
                id_forma_pago: cab.forma_pago,
                uso_cfdi: cab.uso_cfdi,
                subtotal: totales.subtotal,
                iva: totales.iva,
                total: totales.total,
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva,
                })),
            }, t);

            await crearCxCyRemision({
                factura_id: factura.id_factura,
                cab,
                totales,
                conceptos,
                dias_credito,
                esPublicoGeneral,
            }, t);

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura: factura.id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();

            return {
                ruta: rutaArchivo,
                folio,
                id_factura: factura.id_factura,
                flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
                credito_generado: true,
            };

        } catch (error) {
            await t.rollback();
            if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
            throw error;
        }
    },

    // ── Timbrar Ingreso — genera .txt y registra en BD ────────────────────────
    timbrarIngreso: async (dto: IGenerarFacturaDTO) => {

        const { id_pedido_alm, id_empresa, id_cliente_real, id_empleado, forzar_credito, usuario_admin, password_admin } = dto;

        let autorizador: { usuario: string; id_user: string | null } | null = null;
        if (forzar_credito) {
            if (!usuario_admin || !password_admin) {
                throw new Error('Se requieren credenciales de administrador para omitir el límite de crédito.');
            }
            autorizador = await verificarAdmin(usuario_admin, password_admin);
        }

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(id_pedido_alm),
        ]);

        if (!conceptos.length) throw new Error('El pedido no tiene conceptos para facturar');

        if (cab.id_empresa_sys_anterior != null && cab.tipo_comprobante === 'TRA') {
            return FacturacionService._timbrarTraslado({ cab, conceptos, id_empresa, id_empleado });
        }

        const dias_credito = Number(cab.plazo_pago_cliente ?? 0);
        const esPublicoGeneral = detectarPublicoGeneral(cab.rfc_cliente, cab.nom_empre_receptor);
        const limite = Number(cab.limite_por_factura ?? 0);
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const particiones = particionarConceptos(conceptos, limite);
        const basefolio = await FacturacionRepository.getSiguienteFolio();

        type RegistroIntermedio = {
            id_factura: string;
            folio: number;
            totales: ReturnType<typeof calcularTotales>;
            id_remision: string | null;
            conceptosParte: ConceptoFacturacion[];
        };

        const registros: RegistroIntermedio[] = [];
        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });

        try {
            // Lock + guard: evita timbrar dos veces el mismo pedido (doble clic, reintento
            // tras error de red/UI, o repetir el flujo después de forzar el status a mano).
            const pedidoLock = await Pedido_Almacen.findByPk(cab.id_pedido_alm, {
                attributes: ['id_pedido_alm', 'status_pedido_alm', 'fecha_facturado_pedido_alm'],
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            if (!pedidoLock) throw new Error('Pedido no encontrado.');
            if (pedidoLock.status_pedido_alm === 'FA' || pedidoLock.fecha_facturado_pedido_alm) {
                throw new Error('Este pedido ya fue facturado. Revisa el módulo de Facturas antes de timbrar de nuevo.');
            }

            for (let i = 0; i < particiones.length; i++) {
                const conceptosParte = particiones[i];
                const totales = calcularTotales(conceptosParte);
                const folio = basefolio + i;

                const factura = await FacturacionRepository.registrarFactura({
                    folio,
                    tipo_cfdi: 'I',
                    origen_factura: 'PED',
                    id_pedido_alm: cab.id_pedido_alm,
                    id_cliente_alm: cab.id_cliente_alm,
                    id_empresa_facturas: id_empresa ?? null,
                    id_metodo_pago: cab.metodo_pago,
                    id_forma_pago: cab.forma_pago,
                    uso_cfdi: cab.uso_cfdi,
                    subtotal: totales.subtotal,
                    iva: totales.iva,
                    total: totales.total,
                    conceptos: conceptosParte.map(c => ({
                        id_articulo: c.id_articulo,
                        descripcion: c.descripcion,
                        cantidad: c.cantidad,
                        precio_unitario: c.precio_unitario,
                        subtotal_linea: c.subtotal_linea,
                        tasa_iva: c.tasa_iva,
                    })),
                }, t);

                const id_remision = await crearCxCyRemision({
                    factura_id: factura.id_factura,
                    cab: { ...cab, id_cliente_alm: id_cliente_real ?? cab.id_cliente_alm },
                    totales,
                    conceptos: conceptosParte,
                    dias_credito,
                    esPublicoGeneral,
                    forzar_credito,
                    autorizacion: autorizador ? {
                        usuario_autoriza:     autorizador.usuario,
                        id_usuario_autoriza:  autorizador.id_user,
                        id_empleado_solicita: id_empleado || null,
                        id_pedido_alm:        cab.id_pedido_alm,
                        id_factura:           factura.id_factura,
                    } : undefined,
                }, t);

                registros.push({ id_factura: factura.id_factura, folio, totales, id_remision, conceptosParte });
            }

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura: registros[0].id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();

        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt por cada partición ──────────────────────────────────
        // Público General: el TXT se genera cuando se aplica el pago total, no aquí.
        const emisor: EmisorTxt = {
            nom_empre: nomEmisorTxt(cab.nom_empre, cab.nom_empre_facturacion),
            rfc_empre: cab.rfc_empre,
            regimen_fiscal_empre: cab.regimen_fiscal_empre,
            serie_ingreso: cab.serie_facturacion_empre,
            lugar_expedicion: cab.lugar_expedicion,
        };
        const receptor: ReceptorTxt = esPublicoGeneral ? {
            razon_social: 'VENTA AL PUBLICO EN GENERAL',
            rfc: RFC_PUBLICO_GENERAL,
            domicilio_fiscal: cab.lugar_expedicion,
            regimen_fiscal: '616',
            uso_cfdi: 'S01',
        } : {
            razon_social: cab.razon_social_cliente,
            rfc: cab.rfc_cliente,
            domicilio_fiscal: cab.domicilio_fiscal,
            regimen_fiscal: cab.regimen_fiscal_cliente,
            uso_cfdi: cab.uso_cfdi,
        };

        const facturas = registros.map(({ id_factura, folio, id_remision, conceptosParte }) => {
            // Público General: no generar TXT ahora — se genera al aplicar pago total
            if (esPublicoGeneral) {
                return { id_factura, folio, id_remision, ruta_txt: null, pendiente_pago: true };
            }
            try {
                const conceptosTxt: ConceptoTxt[] = conceptosParte.map(c => ({
                    cve_sat: c.cve_sat,
                    sat_medida: c.sat_medida,
                    desc_medida: c.desc_medida,
                    cod_barras: c.cod_barras,
                    cantidad: c.cantidad,
                    descripcion: c.descripcion,
                    precio_unitario: c.precio_unitario,
                    descuento: c.descuento,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva,
                    impuesto_sat: c.impuesto_sat,
                    tipo_factor: c.tipo_factor,
                    lotes: c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
                }));
                const { ruta } = generarTxtIngreso({
                    emisor, receptor, folio,
                    forma_pago: cab.forma_pago,
                    metodo_pago: cab.metodo_pago,
                    conceptos: conceptosTxt,
                    leyenda,
                    nombreArchivo: `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`,
                });
                return { id_factura, folio, ruta_txt: ruta, id_remision };
            } catch (txtErr: any) {
                console.warn(`[timbrarIngreso] No se pudo generar .txt folio ${folio}:`, txtErr.message);
                return { id_factura, folio, id_remision, error: txtErr.message };
            }
        });

        // ── Empresa propia → insertar en POS viejo ────────────────────────────
        if (cab.id_empresa_sys_anterior != null) {
            const primerFolio = registros[0].folio;
            try {
                await FacturacionService._insertarEnPOSAntiguo({
                    prefijo: 'FAC',
                    id_empresa_sys_anterior: cab.id_empresa_sys_anterior,
                    folio: primerFolio,
                    plazo_pago: cab.plazo_pago_cliente,
                    total: registros[0].totales.total,
                    conceptos,
                });
            } catch (errPoly) {
                console.error('[FACTURA_EMPRESA] Error al insertar en BD vieja:', errPoly);
            }

            if (cab.id_empresa_sys_nuevo) {
                try {
                    const lotesPorArticulo = await getLotesPorPedido(cab.id_pedido_alm);
                    const primerRegistro = registros[0];
                    const id_factura_proveedor = uuidv4();
                    const hoy = new Date();
                    await Factura_Compra_Proveedor.create({
                        id_factura_proveedor,
                        id_compra_prove_factura: null,
                        tipo_origen: 'TRASLADO',
                        id_empresa_emisora: id_empresa,
                        id_empresa_receptora: cab.id_empresa_sys_nuevo,
                        folio_factura_proveedor: `FAC-${primerRegistro.folio}`,
                        estado_factura_proveedor: 'C',
                        fecha_emision: hoy,
                        fecha_vencimiento: hoy,
                        total_factura_proveedor: primerRegistro.totales.total,
                        total_iva_factura: primerRegistro.totales.iva,
                        total_recibido_factura: 0,
                        total_iva_recibido_factura: 0,
                        estatus_pago_factura: 'TRASLADO',
                        url_PDF: null,
                        url_XML: null,
                    });
                    for (const c of conceptos) {
                        const id_det = uuidv4();
                        await Detalle_Factura_Compra_Proveedor.create({
                            id_factura_proveedor_detalle: id_det,
                            id_factura_compra_proveedor: id_factura_proveedor,
                            id_detcompsol: null,
                            id_artic: c.id_articulo,
                            cantidad_articulo_facturada: c.cantidad,
                            precio_articulo_factura: c.precio_unitario,
                            descuento_articulo_factura: 0,
                            iva_articulo_factura: c.tasa_iva,
                            checado: false,
                        });
                        const lotes = lotesPorArticulo.get(c.id_articulo) ?? [];
                        if (lotes.length) {
                            await Lote_Factura_Compra_Proveedor.bulkCreate(
                                lotes.map(l => ({
                                    id_lote_factura_compra_proveedor: uuidv4(),
                                    id_det_factura_proveedor: id_det,
                                    numero_lote: l.lote,
                                    fecha_caducidad: l.fecha_caducidad,
                                    cantidad_lote: l.cantidad,
                                    precio_articulo_factura: c.precio_unitario,
                                    observacion_lote: null,
                                }))
                            );
                        }
                    }
                } catch (errFpr) {
                    console.error('[FACTURA_EMPRESA] No se pudo crear factura por recibir en nuevo ERP:', errFpr);
                }
            }
        }

        return {
            flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO',
            total_facturas: facturas.length,
            facturas,
        };
    },

    // ── Devolución de factura PEN (no timbrada): solo ajusta CxC ─────────────
    _devolverFacturaPEN: async (
        id_factura_origen: string,
        detalles: Array<{ id_articulo: string; cantidad: number }>,
    ) => {
        const factura = await Facturas.findByPk(id_factura_origen, {
            include: [{ model: Detalle_Factura, as: 'detalles' }],
        });
        if (!factura) throw new Error('Factura no encontrada');

        // Calcular monto a descontar
        let montoDevolucion = 0;
        for (const d of detalles) {
            const det = (factura as any).detalles?.find((x: any) => x.id_articulo === d.id_articulo);
            if (!det) throw new Error(`Artículo ${d.id_articulo} no existe en la factura`);
            if (d.cantidad > Number(det.cantidad_facturada)) {
                throw new Error(`Cantidad a devolver (${d.cantidad}) excede la facturada (${det.cantidad_facturada})`);
            }
            const subtotal = +(d.cantidad * Number(det.precio_artic)).toFixed(2);
            const iva = +(subtotal * Number(det.tasa_iva)).toFixed(2);
            montoDevolucion += +(subtotal + iva).toFixed(2);
        }
        montoDevolucion = +montoDevolucion.toFixed(2);

        const esDevolucionTotal = +montoDevolucion.toFixed(2) >= +Number(factura.total_factura).toFixed(2);

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            // Buscar CxC — directa por factura o por remisión
            let cxc = await Cuenta_Por_Cobrar.findOne({
                where: { id_factura: id_factura_origen },
                transaction: t,
            });
            if (!cxc) {
                // Público General: buscar por remisión
                const remision = await Remision.findOne({ where: { id_factura: id_factura_origen }, transaction: t });
                if (remision) {
                    cxc = await Cuenta_Por_Cobrar.findOne({ where: { id_remision: remision.id_remision }, transaction: t });
                }
            }

            if (esDevolucionTotal) {
                // Cancelar factura y CxC
                await factura.update({ estatus_factura: 'CAN' }, { transaction: t });
                if (cxc) await cxc.update({ estatus_cxc: 'CAN', saldo_pendiente: 0 }, { transaction: t });
            } else {
                // Devolución parcial: reducir totales de factura y CxC
                const nuevo_total = +Math.max(Number(factura.total_factura) - montoDevolucion, 0).toFixed(2);
                await factura.update({ total_factura: nuevo_total }, { transaction: t });
                if (cxc) {
                    const nuevo_monto = +Math.max(Number(cxc.monto_total) - montoDevolucion, 0).toFixed(2);
                    const nuevo_saldo = +Math.max(Number(cxc.saldo_pendiente) - montoDevolucion, 0).toFixed(2);
                    const nuevo_estatus = nuevo_saldo <= 0 ? 'PAG' : cxc.estatus_cxc;
                    await cxc.update({ monto_total: nuevo_monto, saldo_pendiente: nuevo_saldo, estatus_cxc: nuevo_estatus }, { transaction: t });
                }
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        return {
            flujo: 'DEVOLUCION_PEN',
            monto_devolucion: montoDevolucion,
            es_total: esDevolucionTotal,
            mensaje: esDevolucionTotal
                ? 'Factura cancelada y CxC cerrada (no había timbrado SAT).'
                : `Descuento de $${montoDevolucion} aplicado a la CxC (factura sin timbrar).`,
        };
    },

    // ── Helper compartido: insert en POS viejo (rme0010/rme00101/rme00102) ────
    _insertarEnPOSAntiguo: async ({
        prefijo, id_empresa_sys_anterior, folio, plazo_pago, total, conceptos,
    }: {
        prefijo: 'TRA' | 'FAC';
        id_empresa_sys_anterior: number;
        folio: number;
        plazo_pago: number;
        total: number;
        conceptos: ConceptoFacturacion[];
    }) => {
        const parseFechaVenci = (f: string): string => {
            const [mes, anio] = f.split('/');
            const m = parseInt(mes, 10);
            const a = parseInt(anio, 10);
            const dia = new Date(a, m, 0).getDate();
            return `${a}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        };

        const rmenufacc = `${prefijo}-${id_empresa_sys_anterior}-${folio}`;
        const fechaHoy = new Date().toISOString().split('T')[0];

        // Guard: si el folio ya fue insertado en el POS antiguo, no duplicar
        const [existing] = await dbPoly.query(
            `SELECT 1 FROM rme0010 WHERE rmenufacc = :rmenufacc AND empcdempn = :empcdempn LIMIT 1`,
            { replacements: { rmenufacc, empcdempn: id_empresa_sys_anterior }, type: QueryTypes.SELECT }
        );
        if (existing) {
            console.log(`[POS_ANTIGUO] Ya existe ${rmenufacc} — omitiendo inserción duplicada`);
            return;
        }

        const tPoly = await dbPoly.transaction();
        try {
            await dbPoly.query(`
                INSERT INTO rme0010 (empcdempn, rmenufacc, prvcdprvn, rmeplazon, rmefecfad, rmefecred, rmefecpad, rmefecemd, rmedscesn, pedcdpedn, rmestatuc, rmenetopn, rmeivafan, rmerupdfc, rmeruxmlc)
                VALUES (:empcdempn, :rmenufacc, 15, :rmeplazon, :rmefecfad, :rmefecfad, :rmefecfad, :rmefecfad, 0, :pedcdpedn, 'C', :rmenetopn, 16, '', '')
            `, {
                replacements: { empcdempn: id_empresa_sys_anterior, rmenufacc, rmeplazon: plazo_pago, rmefecfad: fechaHoy, pedcdpedn: folio, rmenetopn: total },
                type: QueryTypes.INSERT,
                transaction: tPoly,
            });

            for (const c of conceptos) {
                await dbPoly.query(`
                    INSERT INTO rme00101 (empcdempn, rmenufacc, prvcdprvn, artcdartn, rmecanfan, rmecanren, rmecanmen, rmepreunn, rmedescon, rmedesofn, rmepreofn, rmeprentn, rmeimplnn, rmeporivn, rmeimivln, rmeafemoc, rmedesesn)
                    VALUES (:empcdempn, :rmenufacc, 15, :artcdartn, :cantidad, :cantidad, 0, :precio, 0, 0, :precio, :precio, :subtotal, :poriva, :imiva, 'N', 0)
                `, {
                    replacements: {
                        empcdempn: id_empresa_sys_anterior, rmenufacc,
                        artcdartn: c.cod_int_artic, cantidad: c.cantidad,
                        precio: c.precio_unitario, subtotal: c.subtotal_linea,
                        poriva: c.tasa_iva * 100,
                        imiva: +(c.subtotal_linea * c.tasa_iva).toFixed(2),
                    },
                    type: QueryTypes.INSERT,
                    transaction: tPoly,
                });

                // La llave primaria de rme00102 es (empresa, factura, articulo, lote) —
                // si el mismo lote quedó repartido en varias ubicaciones (varias filas
                // de detalle_pedido_almacen_lote), hay que sumarlas en una sola fila
                // antes de insertar, o la segunda choca por llave duplicada.
                const lotesAgrupados = new Map<string, { fecha_venci: string; cantidad: number }>();
                for (const lote of c.lotes) {
                    const existente = lotesAgrupados.get(lote.lote);
                    if (existente) existente.cantidad += lote.cantidad;
                    else lotesAgrupados.set(lote.lote, { fecha_venci: lote.fecha_venci, cantidad: lote.cantidad });
                }

                for (const [numeroLote, datosLote] of lotesAgrupados) {
                    await dbPoly.query(`
                        INSERT INTO rme00102 (empcdempn, rmenufacc, prvcdprvn, artcdartn, rmenulotc, rmefecadd, rmepzacan)
                        VALUES (:empcdempn, :rmenufacc, 15, :artcdartn, :rmenulotc, :rmefecadd, :rmepzacan)
                    `, {
                        replacements: {
                            empcdempn: id_empresa_sys_anterior, rmenufacc,
                            artcdartn: c.cod_int_artic, rmenulotc: numeroLote,
                            rmefecadd: parseFechaVenci(datosLote.fecha_venci),
                            rmepzacan: datosLote.cantidad,
                        },
                        type: QueryTypes.INSERT,
                        transaction: tPoly,
                    });
                }
            }

            await tPoly.commit();
            console.log(`[POS_ANTIGUO] Insertado — ${rmenufacc}`);
        } catch (err) {
            await tPoly.rollback();
            console.error(`[POS_ANTIGUO] Error al insertar — ${rmenufacc}:`, err);
            throw err;
        }
    },

    // ── Reinsertar factura en PolyDB (recuperación de error) ─────────────────
    reinsertarEnPolyDB: async (id_factura: string) => {
        const factura = await Facturas.findByPk(id_factura, {
            include: [{ model: Detalle_Factura, as: 'detalles' }],
        }) as any;
        if (!factura) throw { status: 404, message: 'Factura no encontrada.' };
        if (!['T', 'GEN'].includes(factura.tipo_cfdi) && factura.estatus_factura !== 'GEN')
            throw { status: 400, message: 'Solo se pueden reinsertar facturas tipo T en estado GEN.' };

        // Obtener empresa para id_empresa_sys_anterior y plazo_pago
        const pedido = await dbLocal.query<any>(`
            SELECT pa.id_pedido_alm, pa.cod_int_pedido_alm,
                   ca.id_empresa_sys_anterior
            FROM pedido_almacen pa
            JOIN cliente_almacen ca ON ca.id_cliente_alm = pa.id_cliente_pedido_alm
            WHERE pa.id_pedido_alm = :id_pedido_alm
        `, { replacements: { id_pedido_alm: factura.id_pedido_alm }, type: QueryTypes.SELECT });

        const ped = pedido[0];
        if (!ped?.id_empresa_sys_anterior)
            throw { status: 400, message: 'El cliente del pedido no tiene id_empresa_sys_anterior configurado.' };

        // Obtener lotes del pedido para construir conceptos
        const lotesPedido = await dbLocal.query<any>(`
            SELECT dpa.id_articulo, dpal.cantidad,
                   las.numero_lote_sucursal AS lote,
                   TO_CHAR(las.fecha_venci_lote_sucursal, 'MM/YYYY') AS fecha_venci
            FROM detalle_pedido_almacen_lote dpal
            JOIN detalle_pedido_almacen dpa ON dpa.id_detalle_pedido_almacen = dpal.id_detalle_pedido_almacen
            JOIN lote_articulo_sucursal las ON las.id_lote_sucursal = dpal.id_lote_sucursal
            WHERE dpa.id_pedido_almacen = :id_pedido_alm
        `, { replacements: { id_pedido_alm: factura.id_pedido_alm }, type: QueryTypes.SELECT });

        // Agrupar lotes por articulo
        const lotesPorArticulo: Record<string, { lote: string; fecha_venci: string; cantidad: number; folio_factura_proveedor: null; nom_proveedor: null }[]> = {};
        for (const l of lotesPedido) {
            if (!lotesPorArticulo[l.id_articulo]) lotesPorArticulo[l.id_articulo] = [];
            lotesPorArticulo[l.id_articulo].push({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: Number(l.cantidad), folio_factura_proveedor: null, nom_proveedor: null });
        }

        const articuloInfo = await dbLocal.query<any>(`
            SELECT a.id_artic, a.cod_int_artic, a.cod_barr_artic, a.des_artic
            FROM articulo a
            WHERE a.id_artic IN (:ids)
        `, { replacements: { ids: factura.detalles.map((d: any) => d.id_articulo) }, type: QueryTypes.SELECT });
        const artMap: Record<string, any> = {};
        for (const a of articuloInfo) artMap[a.id_artic] = a;

        const conceptos: import('../interfaces/Facturacion.types').ConceptoFacturacion[] = factura.detalles.map((d: any) => ({
            id_articulo: d.id_articulo,
            cve_sat: '',
            sat_medida: '',
            desc_medida: '',
            cod_int_artic: artMap[d.id_articulo]?.cod_int_artic ?? 0,
            cod_barras: artMap[d.id_articulo]?.cod_barr_artic ?? '',
            cantidad: Number(d.cantidad_facturada),
            descripcion: d.descripcion_articulo,
            precio_unitario: Number(d.precio_artic),
            descuento: 0,
            subtotal_linea: Number(d.subtotal),
            tasa_iva: Number(d.tasa_iva),
            impuesto_sat: '',
            tipo_factor: '',
            necesita_receta: false,
            lotes: lotesPorArticulo[d.id_articulo] ?? [],
        }));

        const folioNum = parseInt(factura.folio_factura, 10);
        await FacturacionService._insertarEnPOSAntiguo({
            prefijo: 'TRA',
            id_empresa_sys_anterior: ped.id_empresa_sys_anterior,
            folio: folioNum,
            plazo_pago: 0,
            total: Number(factura.total_factura),
            conceptos,
        });

        return { mensaje: `Factura TRA-${ped.id_empresa_sys_anterior}-${folioNum} insertada en PolyDB correctamente.` };
    },

    // ── CFDI Traslado (T) — para clientes empresa propia ─────────────────────
    _timbrarTraslado: async ({
        cab, conceptos, id_empresa, id_empleado,
    }: {
        cab: import('../interfaces/Facturacion.types').DatosFacturacionCabecera;
        conceptos: ConceptoFacturacion[];
        id_empresa: string;
        id_empleado: string;
    }) => {
        const totales = calcularTotales(conceptos);
        const folio = await FacturacionRepository.getSiguienteFolio();
        const leyenda = cab.leyenda_factura_empre
            ?? `Traslado Pedido: ${cab.cod_int_pedido_alm}`;

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio,
                tipo_cfdi: 'T',
                origen_factura: 'TRA',
                id_pedido_alm: cab.id_pedido_alm,
                id_cliente_alm: cab.id_cliente_alm,
                id_empresa_facturas: id_empresa ?? null,
                id_metodo_pago: null,
                id_forma_pago: null,
                uso_cfdi: null,
                subtotal: totales.subtotal,
                iva: totales.iva,
                total: totales.total,
                estatus_factura: 'GEN',
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo,
                    descripcion: c.descripcion,
                    cantidad: c.cantidad,
                    precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva,
                })),
            }, t);
            id_factura = factura.id_factura;

            await Stock_Ubicacion_LoteRepository.descontarStockPorPedido(cab.id_pedido_alm, t);
            await Kardex_Movimiento_ArticuloRepository.registrarSalidaPorFactura({
                id_pedido_alm: cab.id_pedido_alm,
                id_empresa,
                id_empleado,
                id_factura,
                cod_pedido: cab.cod_int_pedido_alm,
                t,
            });
            await Pedido_Almacen.update(
                { fecha_facturado_pedido_alm: new Date(), status_pedido_alm: 'FA' },
                { where: { id_pedido_alm: cab.id_pedido_alm }, transaction: t },
            );

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        const now = new Date();
        const fechaStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const pdfBuffer = await generarTrasladoPDFBuffer({
            folio,
            fecha_emision: fechaStr,
            cod_int_pedido: cab.cod_int_pedido_alm,
            nombre_agente: cab.nombre_agente ?? null,
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            nom_empre: cab.nom_empre,
            rfc_empre: cab.rfc_empre,
            nom_empre_receptor: cab.nom_empre_receptor ?? null,
            razon_social: cab.razon_social_cliente,
            rfc_receptor: cab.rfc_cliente,
            calle_receptor: cab.calle_cliente,
            colonia_receptor: cab.colonia_cliente,
            municipio_receptor: cab.municipio_cliente,
            estado_receptor: cab.estado_cliente,
            subtotal: totales.subtotal,
            iva: totales.iva,
            total: totales.total,
            items: conceptos.map(c => ({
                descripcion: c.descripcion,
                cantidad: c.cantidad,
                precio_unitario: c.precio_unitario,
                subtotal_linea: c.subtotal_linea,
                tasa_iva: c.tasa_iva,
                cod_barras: c.cod_barras,
                unidad: c.desc_medida,
                lotes: c.lotes.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
            })),
        });

        if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
        const pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}.pdf`);
        fs.writeFileSync(pdf_url, pdfBuffer);

        await Facturas.update({ pdf_url }, { where: { id_factura } });

        await FacturacionService._insertarEnPOSAntiguo({
            prefijo: 'TRA',
            id_empresa_sys_anterior: cab.id_empresa_sys_anterior!,
            folio,
            plazo_pago: cab.plazo_pago_cliente,
            total: totales.total,
            conceptos,
        });

        const pdfTraspasoBuffer = await construirPdfTraspaso({ cab, conceptos, folio });

        const traspaso_pdf_url = require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}_traspaso.pdf`);
        fs.writeFileSync(traspaso_pdf_url, pdfTraspasoBuffer);

        try {
            const impresora = await Impresora.findOne({
                where: { tipo_impresora: 'LASER', activa: true },
                order: [['createdAt', 'ASC']],
            });
            await Trabajo_Impresion.create({
                cod_interno_pedido: cab.cod_int_pedido_alm,
                id_impresora: impresora?.id_impresora ?? null,
                tipo_documento: 'TRASPASO',
                referencia_codigo: `TRA-${cab.id_empresa_sys_anterior}-${folio}`,
                payload: { tipo: 'pdf', ruta_archivo: traspaso_pdf_url },
                estado: 'PENDIENTE',
                solicitado_por: id_empleado ?? null,
            });
        } catch (errImp) {
            console.error('[TRASLADO] No se pudo encolar trabajo de impresión:', errImp);
        }

        if (cab.id_empresa_sys_nuevo) {
            try {
                const lotesPorArticulo = await getLotesPorPedido(cab.id_pedido_alm);
                const id_factura_proveedor = uuidv4();
                const hoy = new Date();
                await Factura_Compra_Proveedor.create({
                    id_factura_proveedor, id_compra_prove_factura: null,
                    tipo_origen: 'TRASLADO',
                    id_empresa_emisora: id_empresa, id_empresa_receptora: cab.id_empresa_sys_nuevo,
                    folio_factura_proveedor: `TRA-${folio}`, estado_factura_proveedor: 'C',
                    fecha_emision: hoy, fecha_vencimiento: hoy,
                    total_factura_proveedor: totales.total, total_iva_factura: totales.iva,
                    total_recibido_factura: 0, total_iva_recibido_factura: 0,
                    estatus_pago_factura: 'TRASLADO', url_PDF: pdf_url, url_XML: null,
                });
                for (const c of conceptos) {
                    const id_det = uuidv4();
                    await Detalle_Factura_Compra_Proveedor.create({
                        id_factura_proveedor_detalle: id_det,
                        id_factura_compra_proveedor: id_factura_proveedor,
                        id_detcompsol: null, id_artic: c.id_articulo,
                        cantidad_articulo_facturada: c.cantidad,
                        precio_articulo_factura: c.precio_unitario,
                        descuento_articulo_factura: 0, iva_articulo_factura: c.tasa_iva, checado: false,
                    });
                    const lotes = lotesPorArticulo.get(c.id_articulo) ?? [];
                    if (lotes.length) {
                        await Lote_Factura_Compra_Proveedor.bulkCreate(
                            lotes.map(l => ({
                                id_lote_factura_compra_proveedor: uuidv4(),
                                id_det_factura_proveedor: id_det,
                                numero_lote: l.lote, fecha_caducidad: l.fecha_caducidad,
                                cantidad_lote: l.cantidad, precio_articulo_factura: c.precio_unitario,
                                observacion_lote: null,
                            }))
                        );
                    }
                }
            } catch (errFpr) {
                console.error('[TRASLADO] No se pudo crear factura por recibir en nuevo ERP:', errFpr);
            }
        }

        return {
            flujo: 'EMPRESA_PROPIA',
            total_facturas: 1,
            facturas: [{ id_factura, folio, uuid_sat: null, pdf_url, xml_url: null, id_remision: null }],
            traspaso_pdf: traspaso_pdf_url,
        };
    },

    // ── Egreso (Nota de Crédito) — genera .txt ────────────────────────────────
    timbrarEgreso: async (dto: ITimbrarEgresoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura_origen);
        if (!origen) throw new Error('Factura origen no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede crear nota de crédito de facturas tipo Ingreso');
        if (!dto.detalles?.length) throw new Error('Debes especificar al menos un artículo a acreditar');

        // Factura PEN (no timbrada) → solo descontar de la CxC, sin generar CFDI
        if (origen.estatus_factura === 'PEN') {
            return FacturacionService._devolverFacturaPEN(dto.id_factura_origen, dto.detalles);
        }

        const detallesEgreso = dto.detalles.map(d => {
            const original = origen.detalles.find(o => o.id_articulo === d.id_articulo);
            if (!original) throw new Error(`Artículo ${d.id_articulo} no existe en la factura origen`);
            if (d.cantidad > original.cantidad_facturada) {
                throw new Error(`La cantidad a acreditar (${d.cantidad}) excede la facturada (${original.cantidad_facturada})`);
            }
            const subtotal_linea = +(d.cantidad * original.precio_artic).toFixed(2);
            return {
                id_articulo: original.id_articulo,
                descripcion: original.descripcion_articulo,
                cantidad: d.cantidad,
                precio_unitario: original.precio_artic,
                subtotal_linea,
                tasa_iva: original.tasa_iva,
                cve_sat: original.cve_sat,
                sat_medida: original.sat_medida,
                desc_medida: original.desc_medida,
            };
        });

        const subtotal = detallesEgreso.reduce((s, d) => s + d.subtotal_linea, 0);
        const iva = detallesEgreso.reduce((s, d) => s + +(d.subtotal_linea * d.tasa_iva).toFixed(2), 0);
        const total = +(subtotal + iva).toFixed(2);
        const folio = await FacturacionRepository.getSiguienteFolio();

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;

        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio, tipo_cfdi: 'E', origen_factura: 'CXC',
                id_cliente_alm: origen.id_cliente_alm,
                id_empresa_facturas: dto.id_empresa ?? null,
                id_forma_pago: origen.id_forma_pago,
                uso_cfdi: 'G02',
                subtotal: +subtotal.toFixed(2), iva: +iva.toFixed(2), total,
                id_factura_origen: dto.id_factura_origen,
                uuid_relacionado: origen.uuid_sat ?? undefined,
                conceptos: detallesEgreso,
            }, t);
            id_factura = factura.id_factura;
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const empresa = dto.id_empresa ? await obtenerEmisor(dto.id_empresa) : null;
            if (empresa) {
                const series = derivarSeries(empresa.serie_ingreso);
                const { ruta } = generarTxtEgreso({
                    emisor: empresa,
                    receptor: {
                        razon_social: origen.razon_social_cliente,
                        rfc: origen.rfc_cliente,
                        domicilio_fiscal: origen.domicilio_fiscal,
                        regimen_fiscal: origen.regimen_fiscal_cliente,
                        uso_cfdi: 'G02',
                    },
                    folio,
                    uuid_relacionado: origen.uuid_sat ?? '',
                    conceptos: detallesEgreso.map(d => ({
                        cve_sat: d.cve_sat, sat_medida: d.sat_medida, desc_medida: d.desc_medida,
                        cod_barras: '001', cantidad: d.cantidad, descripcion: d.descripcion,
                        precio_unitario: d.precio_unitario, descuento: 0,
                        subtotal_linea: d.subtotal_linea, tasa_iva: d.tasa_iva,
                        impuesto_sat: '002', tipo_factor: 'Tasa',
                    })),
                    leyenda: `Nota de Credito por Devolucion de Factura Interna ${series.ingreso}${origen.folio_factura ?? folio}`,
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarEgreso] No se pudo generar .txt:', txtErr.message);
        }

        return {
            id_factura,
            id_factura_origen: dto.id_factura_origen,
            folio,
            subtotal: +subtotal.toFixed(2),
            iva: +iva.toFixed(2),
            total,
            estatus: 'PEN',
            ruta_txt,
        };
    },

    // ── Regenerar .txt de una factura existente (desde módulo de facturas) ────
    // Remisión faltante de una factura de Público General (botón "Remisión" de Facturas Emitidas).
    // Cuando el pedido se parte en varias facturas por el límite por factura, cada una debe tener
    // su remisión; si a alguna no se le creó, aquí se genera con los productos de ESA factura y se
    // deja ligada su cuenta por cobrar (igual que el flujo normal de Público General).
    generarRemisionFactura: async (id_factura: string) => {
        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw new Error('Factura no encontrada');
        if (factura.tipo_cfdi !== 'I' || !factura.id_pedido_alm) {
            throw new Error('Solo aplica a facturas de ingreso generadas desde un pedido.');
        }
        if (factura.estatus_factura !== 'PEN') {
            throw new Error('La factura ya no está pendiente: su remisión ya no se puede generar.');
        }

        const cliente = await Cliente_Almacen.findByPk(factura.id_cliente_alm);
        if (!cliente) throw new Error('Cliente de la factura no encontrado');
        if (!detectarPublicoGeneral(cliente.rfc_cliente_alm, cliente.nom_corto_cliente_alm)) {
            throw new Error('La remisión solo aplica a facturas de clientes de Público General.');
        }

        const yaTiene = await Remision.findOne({ where: { id_factura }, attributes: ['folio_remision'] });
        if (yaTiene) throw new Error(`Esta factura ya tiene su remisión (REM-${yaTiene.folio_remision}).`);

        const detalles = await Detalle_Factura.findAll({ where: { id_factura } });
        if (!detalles.length) throw new Error('La factura no tiene conceptos para armar la remisión.');

        const pedido = await Pedido_Almacen.findByPk(factura.id_pedido_alm, { attributes: ['id_pedido_alm', 'id_agente_pedido_alm'] });
        if (!pedido?.id_agente_pedido_alm) throw new Error('El pedido no tiene agente asignado (la remisión lo requiere).');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            // Si la factura ya tiene su cuenta por cobrar, se respeta (cliente real, días y monto)
            const cxc = await Cuenta_Por_Cobrar.findOne({ where: { id_factura }, transaction: t, lock: t.LOCK.UPDATE });
            const id_cliente_alm = cxc?.id_cliente_alm ?? factura.id_cliente_alm;
            const dias_credito = cxc ? Number(cxc.dias_credito) : Number(cliente.plazo_pago_cliente_alm ?? 0);

            const folio = await RemisionRepository.getUltimoFolio(t);
            const remision = await RemisionRepository.create({
                id_factura,
                id_pedido_alm:     factura.id_pedido_alm,
                id_cliente_alm,
                id_agente:         pedido.id_agente_pedido_alm,
                dias_credito,
                subtotal_remision: Number(factura.subtotal_factura),
                iva_remision:      Number(factura.iva_factura),
                total_remision:    Number(factura.total_factura),
                notas:             null,
            }, folio, t);

            await Detalle_RemisionRepository.createMultiple(
                remision.id_remision,
                detalles.map(d => ({
                    id_articulo:          d.id_articulo,
                    descripcion_articulo: d.descripcion_articulo,
                    cantidad:             Number(d.cantidad_facturada),
                    precio_unitario:      Number(d.precio_artic),
                    subtotal:             Number(d.subtotal),
                    tasa_iva:             Number(d.tasa_iva),
                    importe_iva:          Number(d.importe_iva),
                })),
                t,
            );

            let cxc_creada = false;
            if (cxc) {
                // En Público General la deuda cuelga de la remisión, no de la factura
                await cxc.update({ id_remision: remision.id_remision, id_factura: null as any }, { transaction: t });
                const estatus = cxc.estatus_cxc === 'PAG' ? 'LIQ' : cxc.estatus_cxc === 'PAR' ? 'PAR' : 'PEN';
                if (estatus !== 'PEN') await RemisionRepository.actualizarEstatus(remision.id_remision, estatus, t);
            } else {
                // Sin cuenta por cobrar: se crea (sin validar límite: la factura ya está emitida)
                const vencimiento = new Date();
                vencimiento.setDate(vencimiento.getDate() + dias_credito);
                await Cuenta_Por_Cobrar.create({
                    id_cxc:            uuidv4(),
                    id_factura:        null as any,
                    id_remision:       remision.id_remision,
                    id_cliente_alm,
                    monto_total:       Number(factura.total_factura),
                    monto_pagado:      0,
                    saldo_pendiente:   Number(factura.total_factura),
                    fecha_vencimiento: vencimiento,
                    dias_credito,
                    estatus_cxc:       'PEN',
                }, { transaction: t });
                cxc_creada = true;
            }

            await t.commit();
            return {
                id_remision:     remision.id_remision,
                folio_remision:  remision.folio_remision,
                id_pedido_alm:   factura.id_pedido_alm,
                total:           Number(factura.total_factura),
                cxc_creada,
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // Cancela la facturación de un pedido (sin timbrar o ya timbrada):
    //  · la factura (y las de su mismo pedido) queda en estatus CANCELADA, no se borra; su remisión también
    //  · la cuenta por cobrar (la deuda) SE BORRA
    //  · TODA la mercancía entra a stock_ubicacion_lote SIN UBICACIÓN y libre, para acomodarse
    //  · el kardex conserva la salida y agrega una entrada que la compensa
    //  · el PEDIDO queda CANCELADO (CN)
    //  Si la factura ya estaba timbrada, la cancelación ante el SAT se hace aparte en el facturador.
    // Si el pedido se partió en varias facturas, se procesan todas.
    deshacerFacturacion: async (
        id_factura: string, id_empresa: string,
        opts: { liberar_stock?: boolean; usuario_admin?: string; password_admin?: string; id_empleado?: string } = {},
    ) => {
        // Acción destructiva: la autoriza un administrador
        if (!opts.usuario_admin || !opts.password_admin) {
            throw new Error('Se requieren credenciales de administrador para deshacer una facturación.');
        }
        const autorizador = await verificarAdmin(opts.usuario_admin, opts.password_admin);

        const base = await Facturas.findByPk(id_factura);
        if (!base) throw new Error('Factura no encontrada');
        if (base.tipo_cfdi !== 'I' || base.origen_factura !== 'PED' || !base.id_pedido_alm) {
            throw new Error('Solo se puede deshacer la facturación de un pedido (factura de ingreso).');
        }
        const id_pedido_alm = base.id_pedido_alm;

        // Las ya canceladas no se vuelven a tocar
        const facturas = (await Facturas.findAll({ where: { id_pedido_alm, tipo_cfdi: 'I', origen_factura: 'PED' } }))
            .filter(f => f.estatus_factura !== 'CAN');
        if (!facturas.length) throw new Error('Las facturas de este pedido ya están canceladas.');
        const ids = facturas.map(f => f.id_factura);
        const folios = facturas.map(f => f.folio_factura);

        // Siempre se cancela (la factura queda CAN); si alguna ya estaba timbrada, falta cancelarla ante el SAT
        const cancelar = true;
        const conTimbrada = facturas.some(f => f.estatus_factura === 'TIM' || !!f.uuid_sat);

        const cab = await FacturacionRepository.getCabecera(id_pedido_alm, id_empresa);
        if (cab.id_empresa_sys_anterior != null) {
            throw new Error('Este pedido es de una empresa propia (se reflejó en el POS anterior y generó su factura por recibir). No se puede deshacer desde aquí.');
        }

        const contar = async (sql: string) => Number((await dbLocal.query<any>(sql, { replacements: { ids }, type: QueryTypes.SELECT }))[0]?.n ?? 0);
        const derivadas = await contar(`SELECT COUNT(*) n FROM facturas WHERE id_factura_origen IN (:ids)`);
        const complementos = await contar(`SELECT COUNT(*) n FROM factura_pago_cfdi WHERE id_factura IN (:ids)`);
        const devoluciones = await contar(`SELECT COUNT(*) n FROM devolucion_cliente WHERE id_factura IN (:ids)`);
        if (derivadas || complementos || devoluciones) {
            throw new Error('La factura ya tiene notas de crédito, complementos de pago o devoluciones ligadas; no se puede deshacer.');
        }
        const pagos = await contar(`
            SELECT COUNT(*) n FROM cuenta_por_cobrar c
            WHERE (c.id_factura IN (:ids) OR c.id_remision IN (SELECT id_remision FROM remision WHERE id_factura IN (:ids)))
              AND (COALESCE(c.monto_pagado, 0) > 0 OR EXISTS (SELECT 1 FROM pago_cxc p WHERE p.id_cxc = c.id_cxc))`);
        if (pagos) {
            throw new Error('La cuenta por cobrar ya tiene pagos o recibos capturados. Cancela primero esos pagos para poder deshacer la facturación.');
        }

        const pedido = await Pedido_Almacen.findByPk(id_pedido_alm, { attributes: ['id_pedido_alm', 'cod_int_pedido_alm', 'status_pedido_alm', 'fecha_facturado_pedido_alm'] });
        if (!pedido) throw new Error('Pedido no encontrado.');
        if (cancelar && !pedido.fecha_facturado_pedido_alm) {
            throw new Error('El pedido no aparece como facturado: no hay mercancía descontada que regresar.');
        }

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let sinUbicar = 0;
        let piezas = 0;
        try {
            await Pedido_Almacen.findByPk(id_pedido_alm, { transaction: t, lock: t.LOCK.UPDATE });

            // 1) Mercancía de regreso. El pedido solo guarda el lote (no la ubicación), así que:
            //    · lote con UNA sola ubicación en el stock → vuelve a esa ubicación
            //    · lote en varias ubicaciones o sin fila → vuelve a "sin ubicar" (se reubica en Existencias por Ubicación)
            const lotes = await dbLocal.query<any>(`
                SELECT dpa.id_articulo, dpal.id_lote_sucursal, SUM(dpal.cantidad) AS cantidad
                FROM detalle_pedido_almacen dpa
                JOIN detalle_pedido_almacen_lote dpal ON dpal.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                WHERE dpa.id_pedido_almacen = :id_pedido_alm
                GROUP BY dpa.id_articulo, dpal.id_lote_sucursal`,
                { replacements: { id_pedido_alm }, type: QueryTypes.SELECT, transaction: t });

            for (const l of lotes) {
                const cant = Number(l.cantidad) || 0;
                if (cant <= 0) continue;

                if (cancelar) {
                    // Factura timbrada cancelada: todo entra libre a "sin ubicación", listo para acomodar
                    const pendiente = await Stock_Ubicacion_Lote.findOne({
                        where: { id_empresa_sucursal: id_empresa, id_articulo: l.id_articulo, id_lote: l.id_lote_sucursal, id_ubicacion_sucursal: null as any },
                        transaction: t, lock: t.LOCK.UPDATE,
                    });
                    if (pendiente) {
                        await pendiente.update({ cantidad: (Number(pendiente.cantidad) || 0) + cant }, { transaction: t });
                    } else {
                        await Stock_Ubicacion_Lote.create({
                            id_empresa_sucursal: id_empresa, id_articulo: l.id_articulo, id_lote: l.id_lote_sucursal,
                            id_ubicacion_sucursal: null, cantidad: cant, cantidad_apartada: 0,
                        } as any, { transaction: t });
                    }
                    piezas += cant;
                    sinUbicar += cant;
                    continue;
                }

                const apartar = opts.liberar_stock ? 0 : cant;

                const filas = await Stock_Ubicacion_Lote.findAll({
                    where: { id_empresa_sucursal: id_empresa, id_articulo: l.id_articulo, id_lote: l.id_lote_sucursal },
                    transaction: t, lock: t.LOCK.UPDATE,
                });

                let destino = filas.length === 1 ? filas[0] : (filas.find(x => x.id_ubicacion_sucursal == null) ?? null);
                if (filas.length !== 1) sinUbicar += cant;

                if (destino) {
                    await destino.update({
                        cantidad: (Number(destino.cantidad) || 0) + cant,
                        // Por defecto queda apartada para este pedido, que se va a volver a facturar
                        cantidad_apartada: (Number(destino.cantidad_apartada) || 0) + apartar,
                    }, { transaction: t });
                } else {
                    await Stock_Ubicacion_Lote.create({
                        id_empresa_sucursal: id_empresa, id_articulo: l.id_articulo, id_lote: l.id_lote_sucursal,
                        id_ubicacion_sucursal: null, cantidad: cant, cantidad_apartada: apartar,
                    } as any, { transaction: t });
                }
                piezas += cant;
            }

            // 2) Kardex
            if (cancelar) {
                // La salida por venta se conserva y una entrada la compensa (queda la huella de la cancelación)
                const ahora = new Date();
                await Kardex_Movimientos_Articulos.bulkCreate(
                    lotes.filter(l => Number(l.cantidad) > 0).map(l => ({
                        id_empresa,
                        fecha: ahora,
                        id_articulo: l.id_articulo,
                        id_lote: l.id_lote_sucursal,
                        tipo_movimiento: 'ENTRADA' as const,
                        categoria: 'Entrada_Salida' as const,
                        cantidad_movimiento: Number(l.cantidad),
                        id_pedido: id_pedido_alm,
                        documento_ref: base.id_factura,
                        id_empleado: opts.id_empleado ?? null,
                        notas: `Cancelación de factura ${folios.join(', ')} - Pedido ${pedido.cod_int_pedido_alm} (sin ubicación, por acomodar)`,
                    } as any)),
                    { transaction: t },
                );
            } else {
                // Sin timbrar: se quitan las salidas por venta de estas facturas
                await dbLocal.query(
                    `DELETE FROM kardex_movimientos_articulos WHERE tipo_movimiento = 'VENTA' AND documento_ref IN (:ids)`,
                    { replacements: { ids }, transaction: t });
            }

            // 3) Cuentas por cobrar, remisiones y facturas
            const remisiones = await dbLocal.query<any>(
                `SELECT id_remision FROM remision WHERE id_factura IN (:ids)`,
                { replacements: { ids }, type: QueryTypes.SELECT, transaction: t });
            const idsRem = remisiones.map(r => r.id_remision);

            const cxcs = await dbLocal.query<any>(
                `SELECT id_cxc FROM cuenta_por_cobrar WHERE id_factura IN (:ids)${idsRem.length ? ' OR id_remision IN (:idsRem)' : ''}`,
                { replacements: { ids, idsRem }, type: QueryTypes.SELECT, transaction: t });
            const idsCxc = cxcs.map(c => c.id_cxc);

            if (cancelar) {
                // Las deudas se borran; factura y remisión se conservan como CANCELADAS
                if (idsCxc.length) {
                    await dbLocal.query(
                        `UPDATE autorizacion_credito SET id_cxc = NULL WHERE id_cxc IN (:idsCxc)`,
                        { replacements: { idsCxc }, transaction: t });
                    await dbLocal.query(`DELETE FROM cuenta_por_cobrar WHERE id_cxc IN (:idsCxc)`, { replacements: { idsCxc }, transaction: t });
                }
                if (idsRem.length) {
                    await dbLocal.query(`UPDATE remision SET estatus_remision = 'CAN' WHERE id_remision IN (:idsRem)`, { replacements: { idsRem }, transaction: t });
                }
                await dbLocal.query(`UPDATE facturas SET estatus_factura = 'CAN' WHERE id_factura IN (:ids)`, { replacements: { ids }, transaction: t });
            } else {
                // La bitácora de autorizaciones de crédito se conserva, sin ligas a lo que se borra
                await dbLocal.query(
                    `UPDATE autorizacion_credito SET id_factura = NULL, id_cxc = NULL WHERE id_factura IN (:ids)${idsCxc.length ? ' OR id_cxc IN (:idsCxc)' : ''}`,
                    { replacements: { ids, idsCxc }, transaction: t });

                if (idsCxc.length) await dbLocal.query(`DELETE FROM cuenta_por_cobrar WHERE id_cxc IN (:idsCxc)`, { replacements: { idsCxc }, transaction: t });
                if (idsRem.length) {
                    await dbLocal.query(`DELETE FROM detalle_remision WHERE id_remision IN (:idsRem)`, { replacements: { idsRem }, transaction: t });
                    await dbLocal.query(`DELETE FROM remision WHERE id_remision IN (:idsRem)`, { replacements: { idsRem }, transaction: t });
                }
                await dbLocal.query(`DELETE FROM detalle_factura WHERE id_factura IN (:ids)`, { replacements: { ids }, transaction: t });
                await dbLocal.query(`DELETE FROM facturas WHERE id_factura IN (:ids)`, { replacements: { ids }, transaction: t });
            }

            // 4) Pedido
            if (cancelar) {
                // Factura timbrada cancelada → el pedido queda CANCELADO (CN). Se conserva su fecha de facturado
                // para que no se pueda volver a facturar por error.
                await Cat_Status_Pedido_Almacen.findOrCreate({
                    where: { id_status_pedido_almacen: 'CN' },
                    defaults: { id_status_pedido_almacen: 'CN', descrip_almacen: 'CANCELADO', orden: 101, activo: true } as any,
                    transaction: t,
                });
                await Pedido_Almacen.update({ status_pedido_alm: 'CN' }, { where: { id_pedido_alm }, transaction: t });
            } else {
                // Sin timbrar: vuelve a Chequeo, sin fecha de facturado, para facturarse de nuevo
                await Pedido_Almacen.update(
                    { status_pedido_alm: 'CH', fecha_facturado_pedido_alm: null as any },
                    { where: { id_pedido_alm }, transaction: t });
            }

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // 5) Las que no estaban timbradas: si el .txt aún está en la carpeta del facturador, se quita para que no se timbre
        const txtEliminados: string[] = [];
        for (const folio of facturas.filter(x => x.estatus_factura !== 'TIM' && !x.uuid_sat).map(x => x.folio_factura)) {
            const nombre = `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`;
            try {
                const ruta = `${RUTA_FACTURACION}/${nombre}`;
                if (RUTA_FACTURACION && fs.existsSync(ruta)) { fs.unlinkSync(ruta); txtEliminados.push(nombre); }
            } catch { /* si no se puede borrar, el usuario lo ve en la lista de txt pendientes */ }
        }

        console.warn(`[deshacerFacturacion] Pedido ${pedido.cod_int_pedido_alm} folios ${folios.join(',')} deshecho por ${autorizador.usuario}`);
        return {
            cod_pedido: pedido.cod_int_pedido_alm,
            folios,
            piezas_regresadas: piezas,
            piezas_sin_ubicar: sinUbicar,
            stock_apartado: cancelar ? false : !opts.liberar_stock,
            txt_eliminados: txtEliminados,
            modo: 'CANCELADA' as const,
            sat_pendiente: conTimbrada,
        };
    },

    // Hoja de traspaso de un traslado ya emitido (botón "Traspaso" de Facturas Emitidas).
    // Rearma el documento con lo que se chequeó del pedido; no cambia stock ni estatus de nada.
    generarHojaTraspaso: async (id_factura: string, id_empresa: string) => {
        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw new Error('Factura no encontrada');
        if (factura.tipo_cfdi !== 'T') throw new Error('La hoja de traspaso solo aplica a traslados (tipo T).');
        if (!factura.id_pedido_alm) throw new Error('El traslado no tiene un pedido asociado.');

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(factura.id_pedido_alm, id_empresa),
            FacturacionRepository.getConceptos(factura.id_pedido_alm),
        ]);
        if (!conceptos.length) throw new Error('El pedido no tiene artículos chequeados para el traspaso.');

        const folio = parseInt(String(factura.folio_factura), 10) || 0;
        const buffer = await construirPdfTraspaso({
            cab, conceptos, folio,
            fecha: factura.fecha_emision ? new Date(factura.fecha_emision) : undefined,
        });

        // Se deja también en la carpeta de PDFs, con el mismo nombre que al facturar
        try {
            if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
            fs.writeFileSync(require('path').join(RUTA_PDFS, `TRA_${folio}_${cab.cod_int_pedido_alm}_traspaso.pdf`), buffer);
        } catch (e: any) {
            console.warn('[generarHojaTraspaso] No se pudo guardar el PDF en disco:', e.message);
        }

        return { buffer, nombre: `Traspaso_${folio}.pdf` };
    },

    reintentarTimbrado: async (id_factura: string, id_empresa: string) => {

        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw new Error('Factura no encontrada');
        if (factura.estatus_factura === 'CAN') throw new Error('La factura está cancelada');

        const empresa = await obtenerEmisor(id_empresa);
        if (!empresa) throw new Error('Empresa no encontrada');

        // ── Tipo I: Ingreso ───────────────────────────────────────────────────
        if (factura.tipo_cfdi === 'I') {
            if (!factura.id_pedido_alm) throw new Error('La factura no tiene pedido asociado');

            const [cab, conceptos] = await Promise.all([
                FacturacionRepository.getCabecera(factura.id_pedido_alm, id_empresa),
                FacturacionRepository.getConceptos(factura.id_pedido_alm),
            ]);
            if (!conceptos.length) throw new Error('La factura no tiene conceptos registrados');

            const esPublicoGeneral = detectarPublicoGeneral(cab.rfc_cliente, cab.nom_empre_receptor);
            const folio = Number(factura.folio_factura);
            const leyenda = cab.leyenda_factura_empre
                ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

            const { ruta } = generarTxtIngreso({
                emisor: {
                    nom_empre: nomEmisorTxt(cab.nom_empre, cab.nom_empre_facturacion),
                    rfc_empre: cab.rfc_empre,
                    regimen_fiscal_empre: cab.regimen_fiscal_empre,
                    serie_ingreso: cab.serie_facturacion_empre,
                    lugar_expedicion: cab.lugar_expedicion,
                },
                receptor: esPublicoGeneral ? {
                    razon_social: 'VENTA AL PUBLICO EN GENERAL',
                    rfc: RFC_PUBLICO_GENERAL,
                    domicilio_fiscal: cab.lugar_expedicion,
                    regimen_fiscal: '616',
                    uso_cfdi: 'S01',
                } : {
                    razon_social: cab.razon_social_cliente,
                    rfc: cab.rfc_cliente,
                    domicilio_fiscal: cab.domicilio_fiscal,
                    regimen_fiscal: cab.regimen_fiscal_cliente,
                    uso_cfdi: cab.uso_cfdi,
                },
                folio,
                forma_pago: cab.forma_pago,
                metodo_pago: cab.metodo_pago,
                conceptos: conceptos.map(c => ({
                    cve_sat: c.cve_sat, sat_medida: c.sat_medida, desc_medida: c.desc_medida,
                    cod_barras: c.cod_barras, cantidad: c.cantidad,
                    descripcion: c.descripcion,
                    precio_unitario: c.precio_unitario, descuento: c.descuento,
                    subtotal_linea: c.subtotal_linea,
                    tasa_iva: c.tasa_iva, impuesto_sat: c.impuesto_sat, tipo_factor: c.tipo_factor,
                    lotes: c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
                })),
                leyenda,
                nombreArchivo: `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`,
            });

            return { id_factura, folio, ruta_txt: ruta, flujo: esPublicoGeneral ? 'PUBLICO_GENERAL' : 'CLIENTE_DIRECTO' };
        }

        // ── Tipo E: Egreso ────────────────────────────────────────────────────
        if (factura.tipo_cfdi === 'E') {
            const datos = await FacturacionRepository.getFacturaParaTimbrar(id_factura);
            if (!datos) throw new Error('No se encontraron los datos de la factura E');

            const series = derivarSeries(empresa.serie_ingreso);
            const folio = Number(factura.folio_factura);
            const { ruta } = generarTxtEgreso({
                emisor: empresa,
                receptor: {
                    razon_social: datos.razon_social_cliente,
                    rfc: datos.rfc_cliente,
                    domicilio_fiscal: datos.domicilio_fiscal,
                    regimen_fiscal: datos.regimen_fiscal_cliente,
                    uso_cfdi: 'G02',
                },
                folio,
                uuid_relacionado: factura.uuid_relacionado ?? datos.uuid_sat ?? '',
                conceptos: datos.detalles.map(d => ({
                    cve_sat: d.cve_sat, sat_medida: d.sat_medida, desc_medida: d.desc_medida,
                    cod_barras: '001', cantidad: d.cantidad_facturada,
                    descripcion: d.descripcion_articulo,
                    precio_unitario: d.precio_artic, descuento: 0,
                    subtotal_linea: +(d.cantidad_facturada * d.precio_artic).toFixed(2),
                    tasa_iva: d.tasa_iva, impuesto_sat: '002', tipo_factor: 'Tasa',
                })),
                leyenda: `Nota de Credito por Devolucion de Factura Interna ${series.ingreso}${folio}`,
            });

            return { id_factura, folio, ruta_txt: ruta };
        }

        // ── Tipo P: Complemento de Pago ───────────────────────────────────────
        if (factura.tipo_cfdi === 'P') {
            if (!factura.id_factura_origen) throw new Error('La factura P no tiene factura origen');

            const pagoCFDI = await FacturaPagoCFDI.findOne({
                where: { id_factura: factura.id_factura_origen },
                order: [['createdAt', 'DESC']],
            });
            if (!pagoCFDI) throw new Error('No se encontró el registro FacturaPagoCFDI');

            const origen = await FacturacionRepository.getFacturaParaTimbrar(factura.id_factura_origen);
            if (!origen) throw new Error('Factura origen no encontrada');

            const folio = Number(factura.folio_factura);
            const saldo_insoluto = +(Number(pagoCFDI.saldo_anterior) - Number(pagoCFDI.monto_pagado)).toFixed(2);
            const monto_pagado = Number(pagoCFDI.monto_pagado);
            const impuestos = await calcularImpuestosProporcionalesPago(
                factura.id_factura_origen, monto_pagado,
                origen.total_factura, origen.subtotal_factura, origen.iva_factura,
            );

            const { ruta } = generarTxtPago({
                emisor: empresa,
                receptor: {
                    razon_social: origen.razon_social_cliente,
                    rfc: origen.rfc_cliente,
                    domicilio_fiscal: origen.domicilio_fiscal,
                    regimen_fiscal: origen.regimen_fiscal_cliente,
                    uso_cfdi: 'CP01',
                },
                folio,
                fecha_pago: new Date(pagoCFDI.fecha_pago).toISOString().split('T')[0],
                id_forma_pago: pagoCFDI.forma_de_pago,
                moneda: pagoCFDI.moneda,
                num_cuenta_banco: empresa.num_cuenta_banco ?? undefined,
                rfc_cta_ben: empresa.rfc_banco ?? undefined,
                documentos: [{
                    uuid_relacionado: origen.uuid_sat ?? '',
                    folio_factura: origen.folio_factura ?? String(folio),
                    serie_factura: empresa.serie_ingreso,
                    monto_pago: monto_pagado,
                    saldo_anterior: Number(pagoCFDI.saldo_anterior),
                    saldo_insoluto,
                    num_parcialidad: pagoCFDI.num_parcialidad,
                    moneda: pagoCFDI.moneda,
                    impuestos,
                }],
            });

            return { id_factura, folio, ruta_txt: ruta };
        }

        throw new Error(`Tipo de CFDI '${factura.tipo_cfdi}' no soportado`);
    },

    // ── Complemento de Pago — genera .txt ─────────────────────────────────────
    timbrarPago: async (dto: ITimbrarPagoDTO) => {

        const origen = await FacturacionRepository.getFacturaParaTimbrar(dto.id_factura);
        if (!origen) throw new Error('Factura no encontrada');
        if (origen.tipo_cfdi !== 'I') throw new Error('Solo se puede generar complemento de pago de facturas tipo Ingreso');

        const moneda = dto.moneda ?? 'MXN';
        const saldo_insoluto = +(dto.saldo_anterior - dto.monto_pago).toFixed(2);
        const folio = await FacturacionRepository.getSiguienteFolio();

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura_pago: string;
        let id_pago_cfdi: string;

        try {
            const facturaPago = await Facturas.create({
                folio_factura: String(folio),
                tipo_cfdi: 'P',
                origen_factura: 'CXC',
                fecha_emision: new Date(),
                subtotal_factura: 0,
                iva_factura: 0,
                total_factura: dto.monto_pago,
                estatus_factura: 'PEN',
                id_cliente_alm: origen.id_cliente_alm,
                id_factura_origen: dto.id_factura,
                uuid_relacionado: origen.uuid_sat,
            }, { transaction: t });
            id_factura_pago = facturaPago.id_factura;

            const pagoCFDI = await FacturaPagoCFDI.create({
                id_factura: dto.id_factura,
                id_pago_cxc: dto.id_pago_cxc ?? null,
                fecha_pago: new Date(dto.fecha_pago),
                forma_de_pago: dto.id_forma_pago,
                moneda,
                monto_pagado: dto.monto_pago,
                num_parcialidad: dto.num_parcialidad,
                saldo_anterior: dto.saldo_anterior,
                saldo_insoluto,
                uuid_relacionado: origen.uuid_sat,
                estatus_timbrado: 'PEN',
            }, { transaction: t });
            id_pago_cfdi = pagoCFDI.id_pago_cfdi;

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const empresa = dto.id_empresa ? await obtenerEmisor(dto.id_empresa) : null;
            if (empresa) {
                const impuestos = await calcularImpuestosProporcionalesPago(
                    dto.id_factura, dto.monto_pago,
                    origen.total_factura, origen.subtotal_factura, origen.iva_factura,
                );
                const { ruta } = generarTxtPago({
                    emisor: empresa,
                    receptor: {
                        razon_social: origen.razon_social_cliente,
                        rfc: origen.rfc_cliente,
                        domicilio_fiscal: origen.domicilio_fiscal,
                        regimen_fiscal: origen.regimen_fiscal_cliente,
                        uso_cfdi: 'CP01',
                    },
                    folio,
                    fecha_pago: dto.fecha_pago,
                    id_forma_pago: dto.id_forma_pago,
                    moneda,
                    num_cuenta_banco: empresa.num_cuenta_banco ?? undefined,
                    rfc_cta_ben: empresa.rfc_banco ?? undefined,
                    documentos: [{
                        uuid_relacionado: origen.uuid_sat ?? '',
                        folio_factura: origen.folio_factura ?? String(folio),
                        serie_factura: empresa.serie_ingreso,
                        monto_pago: dto.monto_pago,
                        saldo_anterior: dto.saldo_anterior,
                        saldo_insoluto,
                        num_parcialidad: dto.num_parcialidad,
                        moneda,
                        impuestos,
                    }],
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarPago] No se pudo generar .txt:', txtErr.message);
        }

        return {
            id_factura_pago,
            id_pago_cfdi,
            folio,
            estatus: 'PEN',
            ruta_txt,
        };
    },

    // ── Consolidado de vales — genera .txt ────────────────────────────────────
    timbrarConsolidadoVales: async (dto: {
        id_empresa: string;
        id_empleado: string;
        id_cliente_alm: string | null;
        ids_pedidos: string[];
        conceptos: ConceptoFacturacion[];
        periodo: string;
    }) => {
        const { id_empresa, id_empleado, id_cliente_alm, conceptos, periodo } = dto;

        const empresa = await EmpresaSucursal.findByPk(id_empresa);
        if (!empresa) throw new Error('Empresa no encontrada');

        const totales = calcularTotales(conceptos);
        const folio = await FacturacionRepository.getSiguienteFolio();
        const leyenda = `Vales de medicamentos empleados — ${periodo}`;

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        let id_factura: string;
        try {
            const factura = await FacturacionRepository.registrarFactura({
                folio, tipo_cfdi: 'I', origen_factura: 'VAL',
                id_pedido_alm: dto.ids_pedidos[0],
                id_cliente_alm,
                id_empresa_facturas: id_empresa ?? null,
                id_metodo_pago: 'PUE', id_forma_pago: '01', uso_cfdi: 'G01',
                subtotal: totales.subtotal, iva: totales.iva, total: totales.total,
                conceptos: conceptos.map(c => ({
                    id_articulo: c.id_articulo, descripcion: c.descripcion,
                    cantidad: c.cantidad, precio_unitario: c.precio_unitario,
                    subtotal_linea: c.subtotal_linea, tasa_iva: c.tasa_iva,
                })),
            }, t);
            id_factura = factura.id_factura;
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        // ── Generar .txt ──────────────────────────────────────────────────────
        let ruta_txt: string | undefined;
        try {
            const emisorData = await obtenerEmisor(id_empresa);
            if (emisorData) {
                const { ruta } = generarTxtIngreso({
                    emisor: emisorData,
                    receptor: {
                        razon_social: 'PUBLICO EN GENERAL',
                        rfc: 'XAXX010101000',
                        domicilio_fiscal: (empresa as any).cp_empre ?? '80000',
                        regimen_fiscal: '616',
                        uso_cfdi: 'G01',
                    },
                    folio,
                    forma_pago: '01',
                    metodo_pago: 'PUE',
                    conceptos: conceptos.map(c => ({
                        cve_sat: c.cve_sat, sat_medida: c.sat_medida, desc_medida: c.desc_medida,
                        cod_barras: c.cod_barras, cantidad: c.cantidad,
                        descripcion: buildDescripcionConcepto(c),
                        precio_unitario: c.precio_unitario, descuento: c.descuento,
                        subtotal_linea: c.subtotal_linea, tasa_iva: c.tasa_iva,
                        impuesto_sat: c.impuesto_sat, tipo_factor: c.tipo_factor,
                    })),
                    leyenda,
                    nombreArchivo: `FactDig${(empresa as any).serie_facturacion_empre ?? 'FSH'}${folio}-Ingresos.txt`,
                });
                ruta_txt = ruta;
            }
        } catch (txtErr: any) {
            console.warn('[timbrarConsolidadoVales] No se pudo generar .txt:', txtErr.message);
        }

        return { id_factura, folio, estatus: 'PEN', ruta_txt };
    },

    // ── Recibe el XML timbrado y genera el PDF de la factura ─────────────────
    recibirXml: async (id_factura: string, xmlContent: string) => {
        const factura = await Facturas.findByPk(id_factura);
        if (!factura) throw new Error('Factura no encontrada');

        const cfdi = parseCfdiXml(xmlContent);

        // Guardar XML en disco
        if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
        const xmlFileName = `${cfdi.serie}${cfdi.folio}_${cfdi.uuid}.xml`;
        const xml_url = require('path').join(RUTA_PDFS, xmlFileName);
        fs.writeFileSync(xml_url, xmlContent, 'utf-8');

        // Generar PDF
        const pdfFileName = `${cfdi.serie}${cfdi.folio}_${cfdi.uuid}.pdf`;
        const pdf_url = require('path').join(RUTA_PDFS, pdfFileName);
        const logoPath = process.env.LOGO_EMPRESA_PATH ?? undefined;
        const pedidoRef = factura.id_pedido_alm
            ? await Pedido_Almacen.findByPk(factura.id_pedido_alm, { attributes: ['cod_int_pedido_alm'] })
            : null;
        await generarPdfDesdeCfdi(cfdi, pdf_url, logoPath, pedidoRef?.cod_int_pedido_alm ? { pedido: pedidoRef.cod_int_pedido_alm } : undefined);

        // Actualizar factura con UUID y rutas
        await factura.update({
            uuid_sat: cfdi.uuid,
            fecha_timbrado: new Date(cfdi.fechaTimbrado),
            estatus_factura: 'TIM',
            id_forma_pago: cfdi.formaPago || factura.id_forma_pago,
            id_metodo_pago: cfdi.metodoPago || factura.id_metodo_pago,
            uso_cfdi: cfdi.receptor.usoCFDI || factura.uso_cfdi,
            pdf_url,
            xml_url,
        });

        return {
            uuid: cfdi.uuid,
            folio: `${cfdi.serie}${cfdi.folio}`,
            pdf_url,
            xml_url,
        };
    },
};

// ── Genera el TXT de ingreso para una factura de Público General cuando ya se pagó total ──
export async function timbrarIngresoPublicoGeneral(id_factura: string): Promise<{ ok: boolean; ruta_txt?: string; error?: string }> {
    try {
        const factura = await Facturas.findByPk(id_factura);
        if (!factura) return { ok: false, error: 'Factura no encontrada' };
        if (!factura.id_pedido_alm) return { ok: false, error: 'Factura sin pedido asociado' };
        if (factura.estatus_factura !== 'PEN') return { ok: false, error: `Factura ya en estatus ${factura.estatus_factura}` };

        const [cab, conceptos] = await Promise.all([
            FacturacionRepository.getCabecera(factura.id_pedido_alm, factura.id_empresa_facturas ?? undefined),
            FacturacionRepository.getConceptos(factura.id_pedido_alm),
        ]);

        const folio = Number(factura.folio_factura);
        const leyenda = cab.leyenda_factura_empre
            ?? `Numero de Pedido: ${cab.cod_int_pedido_alm} Agente: ${cab.nombre_agente ?? ''}`;

        const emisor: EmisorTxt = {
            nom_empre: nomEmisorTxt(cab.nom_empre, cab.nom_empre_facturacion),
            rfc_empre: cab.rfc_empre,
            regimen_fiscal_empre: cab.regimen_fiscal_empre,
            serie_ingreso: cab.serie_facturacion_empre,
            lugar_expedicion: cab.lugar_expedicion,
        };
        const receptor: ReceptorTxt = {
            razon_social: 'VENTA AL PUBLICO EN GENERAL',
            rfc: RFC_PUBLICO_GENERAL,
            domicilio_fiscal: cab.lugar_expedicion,
            regimen_fiscal: '616',
            uso_cfdi: 'S01',
        };
        const conceptosTxt: ConceptoTxt[] = conceptos.map(c => ({
            cve_sat: c.cve_sat,
            sat_medida: c.sat_medida,
            desc_medida: c.desc_medida,
            cod_barras: c.cod_barras,
            cantidad: c.cantidad,
            descripcion: c.descripcion,
            precio_unitario: c.precio_unitario,
            descuento: c.descuento,
            subtotal_linea: c.subtotal_linea,
            tasa_iva: c.tasa_iva,
            impuesto_sat: c.impuesto_sat,
            tipo_factor: c.tipo_factor,
            lotes: c.lotes?.map(l => ({ lote: l.lote, fecha_venci: l.fecha_venci, cantidad: l.cantidad })),
        }));

        const { ruta } = generarTxtIngreso({
            emisor, receptor, folio,
            forma_pago: cab.forma_pago,
            metodo_pago: cab.metodo_pago,
            conceptos: conceptosTxt,
            leyenda,
            nombreArchivo: `FactDig${cab.serie_facturacion_empre}${folio}-Ingresos.txt`,
        });

        return { ok: true, ruta_txt: ruta };
    } catch (err: any) {
        console.error('[timbrarIngresoPublicoGeneral] Error:', err.message);
        return { ok: false, error: err.message };
    }
}
