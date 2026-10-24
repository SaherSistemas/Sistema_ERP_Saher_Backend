import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { QueryTypes, Transaction } from "sequelize";
import { ICreateCompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface";
import { ArticuloRepository } from '../../../Catalogos/Articulos/repositories/Articulo.repository';
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";
import { Listado_ProveedorRepository } from "../../Proveedores/repositories/Listado_Proveedor.repository";
import { ProveedorRepository } from '../../Proveedores/repositories/Proveedor.repository';
import { ICreateCompra_General } from '../interface/Compra_General.interface';
import { ICreateOAcumularDetallesSolicitados } from '../interface/Detalle_Compra_Solicitado.interface';
import { CompraGeneralRepository } from '../repositories/Compra_General.repository';
import { mapCompraProveedor } from '../mappers/compraProveedor.mapper';
import id from 'zod/v4/locales/id.js';
import { dbLocal } from '../../../../config/db';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import { Factura_Compra_ProveedorRepository } from '../../../Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository';

export const compraProveedorService = {
    finalizarCapturaYRegistrarNegados: async (opts: {
        id_compra_proveedor: string;
        productosPendientes: { id_artic: string; cantidad_pendiente: number }[];
    }) => {
        await Compra_ProveedorRepository.finalizarCapturaYRegistrarNegados(opts);
    },

    getCompraProveedorPorIdGeneral: async (id_compra_general: string) => {
        const rows = await Compra_ProveedorRepository.getAllCompra_ProveedorPorIdCompGener(id_compra_general)
        //console.log
        const plain = rows.map((r: any) => typeof r.get === 'function' ? r.get({ plain: true }) : r);
        return plain.map(mapCompraProveedor)
    },
    // Vista plana "por proveedor": todos los renglones proveedor-orden de todas las
    // compras generales del rango de fechas (Compras Actuales → "Ver por proveedor").
    getTodasOrdenesPorProveedor: async (id_empresa: string, fechaInicio: string, fechaFin: string) => {
        return await Compra_ProveedorRepository.getTodasOrdenesPorProveedor(id_empresa, fechaInicio, fechaFin);
    },

    getComprasPendientes: async () => {
        const rows = await Factura_Compra_ProveedorRepository.getFacturasPendientes();
        const plain = rows.map((r: any) => typeof r.get === 'function' ? r.get({ plain: true }) : r);
        return plain.map(mapCompraProveedor);
    },
    createCompraProveedor: async (data: IEsctructuraCompra) => {
        const { id_empresa, id_listproveedor, detalle, tipo_compra } = data

        const listado = await Listado_ProveedorRepository.getByID(id_listproveedor)
        const id_proveedor = listado.id_prove_listprove;

        //BUSCAR ARTICULO
        const articulo = await ArticuloRepository.getByIDFlexible(detalle.idarticulo_detcompsol)
        if (!articulo) {
            // La pantalla tenía en memoria un id de artículo que ya no existe (lista vieja sin
            // refrescar, artículo eliminado/reemplazado, etc.) — antes esto tronaba como
            // TypeError sin explicación ("Cannot read properties of null"). Se deja el valor
            // recibido en el mensaje: está pasando en varios artículos distintos, así que hace
            // falta ver exactamente qué está llegando para encontrar el origen real.
            console.error('[createCompraProveedor] idarticulo_detcompsol no encontrado:', JSON.stringify(detalle));
            const err: any = new Error(`Este artículo ya no existe o cambió (id recibido: ${JSON.stringify(detalle.idarticulo_detcompsol)}). Actualiza la pantalla e intenta de nuevo.`);
            err.code = 'ARTICULO_NO_ENCONTRADO';
            throw err;
        }
        const uuidArticulo = articulo.id_artic;

        //BUSCAR O CREAR COMPRA GENERAL EN EL ESTAOD "C" — solo del mismo tipo que se está
        // capturando ahora, para no mezclar (ej. Normal cayendo dentro de una Directa abierta)
        let compraGeneralActiva = await CompraGeneralRepository.getCompraEnCaptura(id_empresa, tipo_compra);

        if (!compraGeneralActiva) {
            // Si la última compra de hoy se finalizó por accidente y aún no se envía
            // al proveedor (estado 'A'), la reabrimos para acumular en la misma en
            // vez de crear una compra aparte.
            const compraPrevia = await CompraGeneralRepository.getUltimaFinalizadaMismoDiaSinEnviar(id_empresa, tipo_compra)
            if (compraPrevia) {
                compraGeneralActiva = await CompraGeneralRepository.reabrirCompra(compraPrevia.id_compra_general)
            }
        }

        let compraProveedor = await Compra_ProveedorRepository.findCompraProveedor_CapturandoByProveedor(id_proveedor, id_empresa)

        //CRAR COMPRA GENERAL
        const dataCrearCompraGeneral: ICreateCompra_General = {
            tipo_compra: tipo_compra,
            fecha_inicio: new Date(),
            id_empre: id_empresa,
            estado_comp: 'C',
            ultimo_articulo_guardado: uuidArticulo
        }
        if (!compraGeneralActiva) {
            compraGeneralActiva = await CompraGeneralRepository.createCompra_General(dataCrearCompraGeneral)
        } else {
            await CompraGeneralRepository.actualizarArticuloGuardadoUltimo(compraGeneralActiva.id_compra_general, uuidArticulo)
        }

        //CREAR COMPRA PROVEEDOR
        const dataCreateCompraProveedor: ICreateCompra_Proveedor = {
            idprove_comp: id_proveedor,
            id_compra_general: compraGeneralActiva.id_compra_general
        }
        if (!compraProveedor) {
            compraProveedor = await Compra_ProveedorRepository.createCompraProveedor(dataCreateCompraProveedor)
        }

        //Agregar o Acumular el detalle
        // * DATA PARA GUARDAR
        const dataAcumularOAgregarDetalles: ICreateOAcumularDetallesSolicitados = {
            id_compra: compraProveedor.id_comp,
            detalles: [
                {
                    idarticulo_detcompsol: uuidArticulo,
                    cantidad_detcompsol: detalle.cantidad_detcompsol,
                    precio_detcompsol: detalle.precio_detcompsol,
                }
            ],
            reemplazar: data.reemplazar,
            id_empleado: data.id_empleado ?? null,
            cantidad_esperada: data.cantidad_esperada,
            forzar: data.forzar,
        }
        const Detalles = await Detalle_Compra_SolicitadoRepository.addDetallesCompraSolicitado(dataAcumularOAgregarDetalles);

        return {
            compra_general: compraGeneralActiva,
            compra_proveedor: compraProveedor,
            detalle_agregado: Detalles
        }

    },

    // Código interno del artículo en el sistema del PROVEEDOR (viene de su listado de precios, que se cruza por
    // código de barras). Si el proveedor no lo tiene cargado, el artículo no aparece en el mapa.
    codigosInternosProveedor: async (id_prove: string | null | undefined, codigosBarras: string[]) => {
        const mapa = new Map<string, string>();
        const limpios = Array.from(new Set(codigosBarras.map(c => String(c ?? '').trim()).filter(Boolean)));
        if (!id_prove || !limpios.length) return mapa;
        try {
            const filas = await dbLocal.query<any>(`
                SELECT trim(dlp.cod_barra_pro_detlist) AS cod, trim(dlp.cod_interno_articulo_prove_detlist) AS cod_prove
                FROM detalle_listado_proveedor dlp
                JOIN listados_proveedor lp ON lp.id_listprove = dlp.id_list_detlist
                WHERE lp.id_prove_listprove = :id_prove
                  AND trim(dlp.cod_barra_pro_detlist) IN (:cods)
                  AND NULLIF(trim(dlp.cod_interno_articulo_prove_detlist), '') IS NOT NULL`,
                { replacements: { id_prove, cods: limpios }, type: QueryTypes.SELECT });
            for (const f of filas) mapa.set(String(f.cod), String(f.cod_prove));
        } catch (e) {
            // Si la columna aún no existe (falta el ALTER TABLE) la orden sale igual, con el código de barras
            console.warn('[orden] No se pudo leer el código interno del proveedor:', (e as any)?.message);
        }
        return mapa;
    },

    // Vista previa de la orden (mismos cálculos que el PDF). No cambia ningún estado:
    // marcar como enviada ocurre solo al generar el PDF.
    obtenerDetalleOrden: async (id_comp: string) => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp);
        if (!compra) throw new Error('Compra no encontrada');

        const { proveedor, detallesCompra } = await Compra_ProveedorRepository.articulosDetalleCompraProveedor(id_comp);

        // Renglones que ya tienen mercancía recibida/capturada en una factura: no se pueden cambiar ni quitar
        const idsDet = (detallesCompra ?? []).map((d: any) => d.id_detcompsol).filter(Boolean);
        const bloqueados = new Set<string>();
        if (idsDet.length) {
            const filas = await dbLocal.query<any>(
                `SELECT DISTINCT id_detcompsol FROM detalle_factura_compra_proveedor WHERE id_detcompsol IN (:ids)`,
                { replacements: { ids: idsDet }, type: QueryTypes.SELECT });
            filas.forEach(f => bloqueados.add(f.id_detcompsol));
        }

        let subtotal = 0;
        const ivaGroups: Record<string, number> = {};
        let items = (detallesCompra ?? []).map((item: any) => {
            const cantidad = Number(item.cantidad_detcompsol);
            const precioUnitario = Number(item.precio_detcompsol);
            const pctIva = Number(item.articulo?.tipo_iva?.porcentaje_iva ?? 0);
            const base = cantidad * precioUnitario;
            const iva = base * pctIva;

            subtotal += base;
            const tasa = `${(pctIva * 100).toFixed(0)}%`;
            ivaGroups[tasa] = (ivaGroups[tasa] ?? 0) + iva;

            return {
                id_detcompsol: item.id_detcompsol as string,
                bloqueado: bloqueados.has(item.id_detcompsol),
                cod_barr_artic: item.articulo?.cod_barr_artic ?? '',
                cod_int_artic: item.articulo?.cod_int_artic ?? null,
                des_artic: item.articulo?.des_artic ?? '',
                cantidad,
                precio_unitario: precioUnitario,
                porcentaje_iva: pctIva,
                iva,
                importe: base + iva,
            };
        });

        // Compra Directa: no usa detalle_compra_solicitado — la factura ya se registró
        // directo en factura_compra_proveedor/detalle_factura_compra_proveedor. Si no
        // hay nada en el flujo normal, se busca ahí para mostrar lo que sí se capturó.
        let esDirecta = false;
        if (items.length === 0) {
            const filasDirecta = await dbLocal.query<any>(`
                SELECT dfcp.id_factura_proveedor_detalle AS id_detcompsol,
                       dfcp.cantidad_articulo_facturada    AS cantidad,
                       dfcp.precio_articulo_factura        AS precio_unitario,
                       a.cod_barr_artic, a.cod_int_artic, a.des_artic,
                       COALESCE(ti.porcentaje_iva, 0)       AS porcentaje_iva
                FROM factura_compra_proveedor fcp
                JOIN detalle_factura_compra_proveedor dfcp ON dfcp.id_factura_compra_proveedor = fcp.id_factura_proveedor
                JOIN articulo a ON a.id_artic = dfcp.id_artic
                LEFT JOIN tipo_iva ti ON ti.id_iva = a.tipo_de_iva
                WHERE fcp.id_compra_prove_factura = :id_comp
                ORDER BY a.des_artic
            `, { replacements: { id_comp }, type: QueryTypes.SELECT });

            if (filasDirecta.length) {
                esDirecta = true;
                subtotal = 0;
                for (const key of Object.keys(ivaGroups)) delete ivaGroups[key];
                items = filasDirecta.map((item: any) => {
                    const cantidad = Number(item.cantidad);
                    const precioUnitario = Number(item.precio_unitario);
                    const pctIva = Number(item.porcentaje_iva ?? 0);
                    const base = cantidad * precioUnitario;
                    const iva = base * pctIva;

                    subtotal += base;
                    const tasa = `${(pctIva * 100).toFixed(0)}%`;
                    ivaGroups[tasa] = (ivaGroups[tasa] ?? 0) + iva;

                    return {
                        id_detcompsol: item.id_detcompsol as string,
                        bloqueado: true, // ya es una factura registrada — no se edita desde aquí
                        cod_barr_artic: (item.cod_barr_artic ?? '').trim(),
                        cod_int_artic: item.cod_int_artic ?? null,
                        des_artic: item.des_artic ?? '',
                        cantidad,
                        precio_unitario: precioUnitario,
                        porcentaje_iva: pctIva,
                        iva,
                        importe: base + iva,
                    };
                });
            }
        }

        const mapaProve = await compraProveedorService.codigosInternosProveedor(
            (compra as any).idprove_comp, items.map((i: any) => i.cod_barr_artic));
        items = items.map((i: any) => ({ ...i, cod_prove: mapaProve.get(String(i.cod_barr_artic ?? '').trim()) ?? null }));

        const iva = Object.keys(ivaGroups).sort().map(tasa => ({ tasa, monto: ivaGroups[tasa] }));
        const totalIva = iva.reduce((s, g) => s + g.monto, 0);

        return {
            id_comp,
            estado_comp: compra.estado_comp,
            fecha_enviada_proveedor: compra.fecha_enviada_proveedor ?? null,
            es_directa: esDirecta,
            proveedor: {
                nomcort_prove: proveedor?.nomcort_prove ?? null,
                razsoc_prove: proveedor?.razsoc_prove ?? null,
                rfc_prove: proveedor?.rfc_prove ?? null,
                telef_prove: proveedor?.telef_prove ?? null,
                corr_prove: proveedor?.corr_prove ?? null,
            },
            items,
            subtotal,
            iva,
            total_iva: totalIva,
            total: subtotal + totalIva,
        };
    },

    generarPDFListado: async (id_comp: string): Promise<Buffer> => {
        const compraProveedor = await Compra_ProveedorRepository.articulosDetalleCompraProveedor(id_comp);
        const { proveedor, detallesCompra } = compraProveedor;

        // Algunos proveedores piden la orden con SU código interno del artículo: si el listado del proveedor lo trae,
        // se agrega la columna "Cód. Prov." además del código de barras.
        const compraCab = await Compra_ProveedorRepository.getByID(id_comp);
        const mapaProve = await compraProveedorService.codigosInternosProveedor(
            (compraCab as any)?.idprove_comp,
            (detallesCompra ?? []).map((d: any) => d.articulo?.cod_barr_artic ?? ''));
        const hayCodProve = (detallesCompra ?? []).some((d: any) => mapaProve.has(String(d.articulo?.cod_barr_artic ?? '').trim()));

        // Folio corto de la orden (el número de la compra general + 4 caracteres de la orden del proveedor)
        let folio = id_comp.slice(0, 8).toUpperCase();
        try {
            const [cg] = await dbLocal.query<any>(
                `SELECT id_interno_compra_gen FROM compra_general WHERE id_compra_general = :id`,
                { replacements: { id: (compraCab as any)?.id_compra_general }, type: QueryTypes.SELECT });
            const interno = String(cg?.id_interno_compra_gen ?? '').trim();
            if (interno) folio = `${interno.split(/[-_]/).pop()}-${id_comp.slice(0, 4).toUpperCase()}`;
        } catch { /* se queda el folio corto de la orden */ }

        // Formato de la cotización de la web: encabezado con logo, datos de la empresa y folio; barra del proveedor;
        // tabla con encabezado oscuro; y desglose Subtotal / IVA / TOTAL.
        const doc = new PDFDocument({ margin: 0, size: 'letter', bufferPages: true });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));

        const PW = 612, PH = 792, MX = 24, CW = PW - MX * 2;
        const GRIS = '#999999', NEGRO = '#111111';
        const LIMITE = PH - 46;   // abajo de aquí va el "Página X de Y"
        const money = (n: number) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Columnas (si el proveedor tiene código interno: una columna más)
        const anchos = hayCodProve
            ? { prov: 52, barras: 78, desc: 170, cant: 34, punit: 56, iva: 34, pciva: 60, importe: 80 }
            : { prov: 0, barras: 88, desc: 214, cant: 34, punit: 56, iva: 34, pciva: 60, importe: 78 };
        const X: Record<string, number> = {};
        let ax = MX;
        for (const k of ['prov', 'barras', 'desc', 'cant', 'punit', 'iva', 'pciva', 'importe'] as const) { X[k] = ax; ax += anchos[k]; }

        const rutaLogo = (): string | null => {
            const candidatos = [
                process.env.RUTA_LOGO_PDF ? path.resolve(process.cwd(), process.env.RUTA_LOGO_PDF) : null,
                path.resolve(process.cwd(), 'assets', 'logo_saher.png'),
            ].filter(Boolean) as string[];
            return candidatos.find(p => fs.existsSync(p)) ?? null;
        };

        // ── Encabezado ──
        const encabezado = (): number => {
            const y0 = 24, h = 78;
            doc.lineWidth(0.8).strokeColor(GRIS).rect(MX, y0, CW, h).stroke();
            doc.moveTo(MX + 110, y0).lineTo(MX + 110, y0 + h).stroke();
            doc.moveTo(MX + CW - 130, y0).lineTo(MX + CW - 130, y0 + h).stroke();

            const logo = rutaLogo();
            if (logo) doc.image(logo, MX + 12, y0 + 16, { fit: [86, 34], align: 'center' });
            else doc.font('Helvetica-Bold').fontSize(22).fillColor('#16a34a').text('Saher', MX, y0 + 24, { width: 110, align: 'center', lineBreak: false });
            doc.font('Helvetica').fontSize(6.5).fillColor('#555555')
                .text('FARMACIAS SAHER', MX, y0 + 54, { width: 110, align: 'center', lineBreak: false })
                .text('DE SINALOA', MX, y0 + 62, { width: 110, align: 'center', lineBreak: false });

            const ex = MX + 122;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(NEGRO).text('FARMACIAS SAHER DE SINALOA S DE RL DE CV', ex, y0 + 12, { lineBreak: false });
            doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
                .text('PASTOR ROUIX #2314 B     INDUSTRIAL EL PALMITO', ex, y0 + 28, { lineBreak: false })
                .text('C.P.: 80160     CULIACÁN, SINALOA', ex, y0 + 41, { lineBreak: false })
                .text('Teléfono: ', ex, y0 + 54, { lineBreak: false, continued: true })
                .font('Helvetica-Bold').text('6677644798', { lineBreak: false });

            const fx = MX + CW - 130;
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555555').text('ORDEN DE COMPRA', fx, y0 + 8, { width: 130, align: 'center', lineBreak: false });
            doc.lineWidth(0.8).strokeColor(GRIS).rect(fx + 8, y0 + 20, 114, 26).stroke();
            doc.font('Helvetica-Bold').fontSize(folio.length > 16 ? 9.5 : folio.length > 12 ? 11 : 15).fillColor(NEGRO)
                .text(folio, fx + 8, y0 + (folio.length > 12 ? 29 : 25), { width: 114, align: 'center', lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#555555').text('FECHA', fx, y0 + 53, { width: 130, align: 'center', lineBreak: false });
            doc.font('Helvetica-Bold').fontSize(10).fillColor(NEGRO).text(dayjs().format('DD/MM/YY'), fx, y0 + 64, { width: 130, align: 'center', lineBreak: false });
            return y0 + h + 8;
        };

        // ── Barra del proveedor (dos renglones, como la del cliente en la cotización) ──
        const correoReal = (c: string | null | undefined) => {
            const v = String(c ?? '').trim();
            return v && !/^sin-correo@/i.test(v) ? v : '—';
        };
        const barraProveedor = (y: number): number => {
            const h = 16;
            doc.lineWidth(0.8).strokeColor(GRIS).rect(MX, y, CW, h * 2).stroke();
            doc.moveTo(MX, y + h).lineTo(MX + CW, y + h).strokeColor('#cccccc').lineWidth(0.5).stroke();
            const corte = MX + CW - 200;
            doc.moveTo(corte, y).lineTo(corte, y + h * 2).stroke();
            const campo = (lbl: string, val: string, x: number, yy: number, w: number) => {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(NEGRO).text(lbl, x, yy, { lineBreak: false, continued: true });
                doc.font('Helvetica').fontSize(8).text(' ' + val, { width: w, lineBreak: false, ellipsis: true });
            };
            const nombre = String(proveedor?.razsoc_prove ?? proveedor?.nomcort_prove ?? '').trim() || String(proveedor?.nomcort_prove ?? '');
            campo('Proveedor:', nombre, MX + 8, y + 4.5, corte - MX - 14);
            campo('Teléfono:', String(proveedor?.telef_prove ?? '—'), corte + 8, y + 4.5, 186);
            campo('RFC:', String(proveedor?.rfc_prove ?? '—'), MX + 8, y + h + 4.5, corte - MX - 14);
            campo('Correo:', correoReal(proveedor?.corr_prove), corte + 8, y + h + 4.5, 186);
            return y + h * 2 + 8;
        };

        // ── Encabezado de la tabla ──
        const encabezadoTabla = (y: number): number => {
            doc.rect(MX, y, CW, 17).fill('#333333');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
            if (hayCodProve) doc.text('Cód. Prov.', X.prov, y + 5, { width: anchos.prov, align: 'center', lineBreak: false });
            doc.text('Cód. Barras', X.barras, y + 5, { width: anchos.barras, align: 'center', lineBreak: false });
            doc.text('Descripción', X.desc, y + 5, { width: anchos.desc, align: 'center', lineBreak: false });
            doc.text('Cant.', X.cant, y + 5, { width: anchos.cant, align: 'center', lineBreak: false });
            doc.text('P. Unit.', X.punit, y + 5, { width: anchos.punit - 4, align: 'right', lineBreak: false });
            doc.text('IVA', X.iva, y + 5, { width: anchos.iva, align: 'center', lineBreak: false });
            doc.text('P c/IVA', X.pciva, y + 5, { width: anchos.pciva - 4, align: 'right', lineBreak: false });
            doc.text('Importe', X.importe, y + 5, { width: anchos.importe - 6, align: 'right', lineBreak: false });
            return y + 17;
        };

        let cy = encabezado();
        cy = barraProveedor(cy);
        cy = encabezadoTabla(cy);

        let subtotalSinIva = 0;
        let ivaTotal = 0;
        let rowIndex = 0;

        for (const item of detallesCompra) {
            const cantidad = Number(item.cantidad_detcompsol);
            const precioUnit = Number(item.precio_detcompsol);
            // El IVA del catálogo viene como fracción (0.16 = 16%)
            const pctRaw = Number(item.articulo?.tipo_iva?.porcentaje_iva ?? 0);
            const pctIva = pctRaw > 1 ? pctRaw / 100 : pctRaw;
            const baseLine = Math.round(cantidad * precioUnit * 100) / 100;
            const ivaLinea = Math.round(baseLine * pctIva * 100) / 100;
            const importeTotal = baseLine + ivaLinea;
            const precioConIva = Math.round(precioUnit * (1 + pctIva) * 100) / 100;

            subtotalSinIva += baseLine;
            ivaTotal += ivaLinea;

            const descText = String(item.articulo?.des_artic ?? '').trim();
            const descGen = String(item.articulo?.des_gener_artic ?? '').trim();
            doc.font('Helvetica').fontSize(8);
            const hDesc = doc.heightOfString(descText, { width: anchos.desc - 8 });
            let hGen = 0;
            if (descGen) { doc.fontSize(6.5); hGen = doc.heightOfString(descGen, { width: anchos.desc - 8 }); }
            const rowH = Math.max(hDesc + hGen + 8, 17);

            if (cy + rowH > LIMITE) {
                doc.addPage();
                cy = encabezadoTabla(MX);
                rowIndex = 0;
            }

            doc.rect(MX, cy, CW, rowH).fill(rowIndex % 2 === 0 ? '#ffffff' : '#f5f5f5');
            const barras = String(item.articulo?.cod_barr_artic ?? '').trim();
            doc.font('Helvetica').fontSize(8).fillColor(NEGRO);
            if (hayCodProve) doc.text(mapaProve.get(barras) ?? '', X.prov + 2, cy + 4, { width: anchos.prov - 4, align: 'center', lineBreak: false });
            doc.font('Courier').fontSize(7.5).text(barras, X.barras + 2, cy + 4.5, { width: anchos.barras - 4, align: 'center', lineBreak: false });
            doc.font('Helvetica').fontSize(8).text(descText, X.desc + 4, cy + 4, { width: anchos.desc - 8 });
            if (descGen) doc.font('Helvetica').fontSize(6.5).fillColor('#666666').text(descGen, X.desc + 4, cy + 4 + hDesc, { width: anchos.desc - 8 });
            doc.font('Helvetica').fontSize(8).fillColor(NEGRO);
            doc.text(`${cantidad}`, X.cant, cy + 4, { width: anchos.cant, align: 'center', lineBreak: false });
            doc.text(money(precioUnit), X.punit, cy + 4, { width: anchos.punit - 4, align: 'right', lineBreak: false });
            doc.text(`${Math.round(pctIva * 100)}%`, X.iva, cy + 4, { width: anchos.iva, align: 'center', lineBreak: false });
            doc.text(money(precioConIva), X.pciva, cy + 4, { width: anchos.pciva - 4, align: 'right', lineBreak: false });
            doc.font('Helvetica-Bold').text(money(importeTotal), X.importe, cy + 4, { width: anchos.importe - 6, align: 'right', lineBreak: false });

            doc.moveTo(MX, cy + rowH).lineTo(MX + CW, cy + rowH).strokeColor('#dddddd').lineWidth(0.4).stroke();
            cy += rowH;
            rowIndex++;
        }

        // ── Desglose como factura ──
        const total = subtotalSinIva + ivaTotal;
        const bw = 230, bh = 22;
        if (cy + 12 + bh * 3 > LIMITE) { doc.addPage(); cy = MX; }
        cy += 12;
        const bx = MX + CW - bw;
        doc.lineWidth(0.8).strokeColor(GRIS).rect(bx, cy, bw, bh * 3).stroke();
        doc.moveTo(bx, cy + bh).lineTo(bx + bw, cy + bh).strokeColor('#dddddd').lineWidth(0.5).stroke();
        doc.rect(bx + 0.4, cy + bh * 2, bw - 0.8, bh - 0.4).fill('#f1f1f1');
        doc.moveTo(bx, cy + bh * 2).lineTo(bx + bw, cy + bh * 2).strokeColor(GRIS).lineWidth(0.8).stroke();
        doc.font('Helvetica').fontSize(10).fillColor(NEGRO);
        doc.text('Subtotal:', bx + 12, cy + 6, { lineBreak: false });
        doc.text(money(subtotalSinIva), bx, cy + 6, { width: bw - 12, align: 'right', lineBreak: false });
        doc.text('IVA:', bx + 12, cy + bh + 6, { lineBreak: false });
        doc.text(money(ivaTotal), bx, cy + bh + 6, { width: bw - 12, align: 'right', lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('TOTAL:', bx + 12, cy + bh * 2 + 5, { lineBreak: false });
        doc.text(money(total), bx, cy + bh * 2 + 5, { width: bw - 12, align: 'right', lineBreak: false });

        // ── Pie: número de página ──
        const paginas = doc.bufferedPageRange();
        for (let p = 0; p < paginas.count; p++) {
            doc.switchToPage(paginas.start + p);
            doc.font('Helvetica').fontSize(8).fillColor('#999999')
                .text(`Página ${p + 1} de ${paginas.count}`, MX, PH - 34, { width: CW, align: 'right', lineBreak: false });
        }

        doc.end();
        return new Promise((resolve) => {
            doc.on('end', async () => {
                await Compra_ProveedorRepository.actualizarFechaEnviadaProveedor(id_comp);
                resolve(Buffer.concat(buffers));
            });
        });
    },

    obtenerNombreArchivoPDF: async (id_comp: string): Promise<string> => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp);
        if (!compra) {
            throw new Error('Compra no encontrada');
        }

        const proveedore = await ProveedorRepository.findByPKNOMBRE(compra.idprove_comp);

        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();

        const fechaFormateada = `${dia}-${mes}-${anio}`;


        const proveedor = proveedore.nomcort_prove || 'Proveedor';
        return `${proveedor}_${fechaFormateada}.pdf`;
    },


    getAllCompras_ProveedorParaRecibir: async (id_empresa_sucursal: string) => {
        return await Compra_ProveedorRepository.getAllCompras_ProveedorParaRecibir(id_empresa_sucursal)
    },

    marcarCompraProveedorComoRecibida: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.marcarCompraProveedorComoRecibida(id_comp, id_empleado);
    },

    reabrirParaNuevaFactura: async (id_comp: string) => {
        return await Compra_ProveedorRepository.reabrirParaNuevaFactura(id_comp);
    },

    marcarIniciarChecado: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.iniciarChequeoDeCompraProveedor(id_comp, id_empleado)
    },

    marcarInicioAcomodo: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.iniciarAcomodoDeCompraProveedor(id_comp, id_empleado)
    },
    marcarFinAcomodo: async (id_comp: string, id_empleado: string) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        // ! TAMBIEN TENEMOS QUE SUMAR LO QUE SE CHECO AL TOTAL DE LA COMPRA GENERAL
        //MARCAR FIN ACOMODO DE LA COMPRA PROVEEDOR
        await Compra_ProveedorRepository.finalizarAcomodoDeCompraProveedor(id_comp, id_empleado, { transaction: t })
        //FINALIZAR COMPRA GENERAL SI YA NO HAY MAS COMPRAS EN ESTATUS DIFERENTE A F
        const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp, t);

        //NUMERO DE PENDIENTES
        const pendientes = await Compra_ProveedorRepository.comprasProveedorSinTerminar(compraProveedor.id_compra_general, { transaction: t })
        if (pendientes.pendientes === 0) {
            await CompraGeneralRepository.finalizarCompraGeneralSiEsNecesario(compraProveedor.id_compra_general, pendientes.pendientes, { transaction: t });
        }
        await t.commit();
        return {
            pendientes: pendientes.pendientes,
        };
    },

}
