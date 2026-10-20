import fs from 'fs';
import os from 'os';
import path from 'path';
import { QueryTypes, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { dbLocal } from '../../../../config/db';
import Devolucion_Proveedor from '../model/Devolucion_Proveedor';
import Devolucion_Proveedor_Detalle from '../model/Devolucion_Proveedor_Detalle';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import { NotasCreditoProveedorRepository } from '../../../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository';
import { EntradaInventarioFacturaService } from './EntradaInventarioFactura.service';
import { generarPdfDevolucionProveedor } from '../helpers/devolucion_proveedor.pdf';
import { ImpresoraRepository } from '../../../Impresiones/repositories/ImpresoraRepository';
import { TrabajoImpresionRepository } from '../../../Impresiones/repositories/TrabajoImpresionRepository';
import { toAgentPath } from '../../../Impresiones/services/TrabajoImpresion.service';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const errorNegocio = (mensaje: string, status = 400) => Object.assign(new Error(mensaje), { status, expose: true });

// Estados de la factura en los que ya se recibió la mercancía (C y R todavía se están chequeando: ahí se usa el chequeo)
const ESTADOS_ELEGIBLES = ['H', 'D', 'A', 'F'];

export const MOTIVOS_DEVOLUCION_PROVEEDOR = [
    'Próximo a caducar',
    'Producto dañado',
    'Producto equivocado',
    'Error de pedido',
    'Otro',
] as const;

export interface ILineaElegible {
    id_detalle: string;
    id_articulo: string;
    des_artic: string;
    cod_barr_artic: string;
    numero_lote: string;
    caducidad: string | null;
    id_lote_sucursal: string | null;
    recibido: number;        // lo que se recibió de ese lote en esa factura
    devuelto: number;        // lo que ya se devolvió antes
    libre: number;           // piezas libres en el almacén de ese lote (existencia menos apartadas)
    maximo: number;          // lo que se puede devolver ahora
    precio_neto: number;     // precio con el descuento de la factura, sin IVA
    iva_unitario: number;
}

async function cargarElegibles(id_factura: string, id_empresa: string, t?: Transaction) {
    const [fac] = await dbLocal.query<any>(`
        SELECT f.id_factura_proveedor, f.folio_factura_proveedor, f.estado_factura_proveedor, f.tipo_origen,
               f.id_compra_prove_factura, f.fecha_emision,
               p.nomcort_prove AS proveedor
        FROM factura_compra_proveedor f
        LEFT JOIN compra_proveedor cp ON cp.id_comp = f.id_compra_prove_factura
        LEFT JOIN proveedor p ON p.id_prove = cp.idprove_comp
        WHERE f.id_factura_proveedor = :f`,
        { replacements: { f: id_factura }, type: QueryTypes.SELECT, transaction: t });
    if (!fac) throw errorNegocio('Factura no encontrada.', 404);

    const filas = await dbLocal.query<any>(`
        SELECT d.id_factura_proveedor_detalle AS id_detalle,
               COALESCE(d.id_artic, dcs.idarticulo_detcompsol) AS id_articulo,
               a.des_artic, a.cod_barr_artic,
               COALESCE(d.precio_articulo_factura, 0) AS precio,
               COALESCE(d.descuento_articulo_factura, 0) AS descuento,
               COALESCE(d.iva_articulo_factura, 0) AS iva,
               lr.numerolote_lote AS numero_lote,
               MIN(lr.fechavencimiento_lote) AS caducidad,
               SUM(lr.cantidad_lote) AS recibido
        FROM detalle_factura_compra_proveedor d
        LEFT JOIN detalle_compra_solicitado dcs ON dcs.id_detcompsol = d.id_detcompsol
        JOIN articulo a ON a.id_artic = COALESCE(d.id_artic, dcs.idarticulo_detcompsol)
        JOIN detalle_compra_recibido dr ON dr.id_detalle_factura_compra_proveedor = d.id_factura_proveedor_detalle
        JOIN lotes_recibidos_compra lr ON lr.id_detallecompr_recibido = dr.id_detcomprec
        WHERE d.id_factura_compra_proveedor = :f AND lr.cantidad_lote > 0
        GROUP BY d.id_factura_proveedor_detalle, COALESCE(d.id_artic, dcs.idarticulo_detcompsol), a.des_artic, a.cod_barr_artic,
                 d.precio_articulo_factura, d.descuento_articulo_factura, d.iva_articulo_factura, lr.numerolote_lote
        ORDER BY a.des_artic, MIN(lr.fechavencimiento_lote)`,
        { replacements: { f: id_factura }, type: QueryTypes.SELECT, transaction: t });

    if (!filas.length) return { factura: fac, lineas: [] as ILineaElegible[] };

    const ids = Array.from(new Set(filas.map((x: any) => String(x.id_detalle))));
    const arts = Array.from(new Set(filas.map((x: any) => String(x.id_articulo))));

    // Lo ya devuelto antes, por renglón y lote
    const devueltos = await dbLocal.query<any>(`
        SELECT id_factura_proveedor_detalle AS id_detalle, numero_lote, SUM(cantidad) AS devuelto
        FROM devolucion_proveedor_detalle WHERE id_factura_proveedor_detalle IN (:ids)
        GROUP BY id_factura_proveedor_detalle, numero_lote`,
        { replacements: { ids }, type: QueryTypes.SELECT, transaction: t });
    const devMap = new Map(devueltos.map((d: any) => [`${d.id_detalle}|${String(d.numero_lote).trim()}`, Number(d.devuelto) || 0]));

    // Lote del inventario (artículo + número) y sus piezas libres en el almacén de quien devuelve
    const libres = await dbLocal.query<any>(`
        SELECT l.id_lote_sucursal, l.id_artic, TRIM(l.numero_lote_sucursal) AS numero_lote,
               COALESCE(SUM(GREATEST(s.cantidad - COALESCE(s.cantidad_apartada, 0), 0)), 0) AS libre
        FROM lote_articulo_sucursal l
        LEFT JOIN stock_ubicacion_lote s ON s.id_lote = l.id_lote_sucursal AND s.id_empresa_sucursal = :emp
        WHERE l.id_empre = :emp AND l.id_artic IN (:arts)
        GROUP BY l.id_lote_sucursal, l.id_artic, l.numero_lote_sucursal`,
        { replacements: { emp: id_empresa, arts }, type: QueryTypes.SELECT, transaction: t });
    const libreMap = new Map(libres.map((l: any) => [`${l.id_artic}|${String(l.numero_lote).trim()}`, l]));

    const lineas: ILineaElegible[] = filas.map((x: any) => {
        const numero = String(x.numero_lote ?? '').trim();
        const lote = libreMap.get(`${x.id_articulo}|${numero}`);
        const recibido = Number(x.recibido) || 0;
        const devuelto = devMap.get(`${x.id_detalle}|${numero}`) ?? 0;
        const libre = Number(lote?.libre) || 0;
        const neto = Number(x.precio) * (1 - Number(x.descuento) / 100);
        return {
            id_detalle: String(x.id_detalle),
            id_articulo: String(x.id_articulo),
            des_artic: String(x.des_artic ?? '').trim(),
            cod_barr_artic: String(x.cod_barr_artic ?? '').trim(),
            numero_lote: numero,
            caducidad: x.caducidad ?? null,
            id_lote_sucursal: lote?.id_lote_sucursal ?? null,
            recibido,
            devuelto,
            libre,
            maximo: Math.max(0, Math.min(recibido - devuelto, libre)),
            precio_neto: r2(neto),
            iva_unitario: r2(neto * (Number(x.iva) / 100)),
        };
    });
    return { factura: fac, lineas };
}

export interface IResultadoImpresion { ok: boolean; motivo?: string }

// Genera el PDF de la devolución, lo deja en la carpeta compartida y manda el trabajo a la impresora de la estación
// "PRINCIPAL" (se configura en Impresoras). Nunca lanza error: si no se puede imprimir, lo dice y la
// devolución queda creada igual (se puede reimprimir abriendo el PDF).
async function imprimirDocumento(id_devolucion: string, folio: string, id_empresa: string): Promise<IResultadoImpresion> {
    try {
        const buffer = await DevolucionProveedorService.pdf(id_devolucion);
        const carpeta = process.env.RUTA_PDFS_GUARDAR ?? path.join(os.tmpdir(), 'devoluciones_proveedor');
        if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
        const ruta = path.join(carpeta, `devolucion_proveedor_${folio}.pdf`);
        fs.writeFileSync(ruta, buffer);

        const estacion = process.env.ESTACION_DEVOLUCIONES_PROVEEDOR || 'PRINCIPAL';
        const id_impresora = await ImpresoraRepository.getImpresora(id_empresa, estacion);
        await TrabajoImpresionRepository.create({
            cod_interno_pedido: folio,
            tipo_documento: 'DEVOLUCION_PROVEEDOR',
            id_impresora,
            payload: { tipo: 'pdf', ruta_archivo: toAgentPath(ruta) },
            max_intentos: 3,
        });
        return { ok: true };
    } catch (err: any) {
        console.error('[DevolucionProveedor] No se pudo mandar a imprimir:', err?.message ?? err);
        return { ok: false, motivo: err?.message ?? 'No se pudo mandar a imprimir.' };
    }
}

export const DevolucionProveedorService = {

    // Lo que se puede devolver de una factura ya recibida
    elegibles: async (id_factura: string, id_empresa: string) => {
        const { factura, lineas } = await cargarElegibles(id_factura, id_empresa);
        const permitida = ESTADOS_ELEGIBLES.includes(String(factura.estado_factura_proveedor)) && factura.tipo_origen !== 'TRASLADO';
        return {
            factura: {
                id_factura_proveedor: factura.id_factura_proveedor,
                folio: factura.folio_factura_proveedor,
                estado: factura.estado_factura_proveedor,
                proveedor: factura.proveedor,
                fecha_emision: factura.fecha_emision,
                permitida,
                motivo_no_permitida: permitida ? null
                    : factura.tipo_origen === 'TRASLADO' ? 'Los traslados entre sucursales no se devuelven al proveedor.'
                        : 'La factura todavía se está chequeando: corrige las cantidades en el chequeo.',
            },
            motivos: MOTIVOS_DEVOLUCION_PROVEEDOR,
            lineas,
        };
    },

    crear: async (data: {
        id_factura_proveedor: string;
        motivo: string;
        observaciones?: string | null;
        lineas: { id_detalle: string; numero_lote: string; cantidad: number }[];
        id_empresa: string;
        id_empleado?: string | null;
        usuario?: string | null;
    }) => {
        const motivo = String(data.motivo ?? '').trim();
        if (!motivo) throw errorNegocio('Indica el motivo de la devolución.');
        const pedidas = (data.lineas ?? []).filter(l => Number(l.cantidad) > 0);
        if (!pedidas.length) throw errorNegocio('Indica al menos un artículo y su cantidad a devolver.');
        if (!data.id_empresa) throw errorNegocio('No se pudo identificar la sucursal del usuario.');

        const t = await dbLocal.transaction();
        try {
            const { factura, lineas } = await cargarElegibles(data.id_factura_proveedor, data.id_empresa, t);
            if (!ESTADOS_ELEGIBLES.includes(String(factura.estado_factura_proveedor))) {
                throw errorNegocio('Esta factura todavía se está chequeando: corrige las cantidades desde el chequeo.');
            }
            if (factura.tipo_origen === 'TRASLADO') throw errorNegocio('Los traslados entre sucursales no se devuelven al proveedor.');

            // Validar contra lo elegible
            const aDevolver: { l: ILineaElegible; cantidad: number }[] = [];
            const yaPedido = new Map<string, number>();
            for (const p of pedidas) {
                const cantidad = Number(p.cantidad);
                if (!Number.isInteger(cantidad) || cantidad <= 0) throw errorNegocio('Las cantidades a devolver deben ser enteros mayores a 0.');
                const numero = String(p.numero_lote ?? '').trim();
                const l = lineas.find(x => x.id_detalle === String(p.id_detalle) && x.numero_lote === numero);
                if (!l) throw errorNegocio('Uno de los renglones no pertenece a la factura.');
                const clave = `${l.id_detalle}|${l.numero_lote}`;
                const acumulado = (yaPedido.get(clave) ?? 0) + cantidad;
                yaPedido.set(clave, acumulado);
                if (acumulado > l.maximo) {
                    throw errorNegocio(
                        `"${l.des_artic}" lote ${l.numero_lote}: solo se pueden devolver ${l.maximo} pz ` +
                        `(recibidas ${l.recibido}, ya devueltas ${l.devuelto}, libres en el almacén ${l.libre}).`, 409);
                }
                if (!l.id_lote_sucursal) throw errorNegocio(`"${l.des_artic}" lote ${l.numero_lote}: no se encontró ese lote en el inventario.`, 409);
                aDevolver.push({ l, cantidad });
            }

            const folioFac = String(factura.folio_factura_proveedor ?? '');
            let subtotal = 0;
            let iva = 0;

            // 1) Salen las piezas del inventario (solo libres) + Kardex
            for (const { l, cantidad } of aDevolver) {
                await EntradaInventarioFacturaService.sacarPorDevolucion({
                    id_empresa: data.id_empresa,
                    id_articulo: l.id_articulo,
                    id_factura: data.id_factura_proveedor,
                    id_lote: l.id_lote_sucursal as string,
                    numero_lote: l.numero_lote,
                    cantidad,
                    id_empleado: data.id_empleado ?? null,
                    notas: `Devolución a proveedor · Factura ${folioFac} · ${motivo}`,
                    t,
                });
                await EntradaInventarioFacturaService.descontarEntradaRegistrada(l.id_detalle, l.id_lote_sucursal as string, cantidad, t);
                subtotal += cantidad * l.precio_neto;
                iva += cantidad * l.iva_unitario;
            }
            subtotal = r2(subtotal);
            iva = r2(iva);
            const total = r2(subtotal + iva);

            // 2) Nota de crédito PENDIENTE al proveedor
            const nc = await NotasCreditoProveedorRepository.create({
                id_factura_proveedor: data.id_factura_proveedor,
                folio_nc: `NC-DEV-${folioFac || 'S-F'}-${Date.now()}`,
                motivo_nc: `Devolución de mercancía recibida (${motivo})`,
                fecha_emision: new Date(),
                total_nc: total,
                estado_nc: 'P',
            }, { transaction: t });

            // 3) Registro de la devolución y su detalle
            const id_devolucion = uuidv4();
            const folio_devolucion = `DP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id_devolucion.slice(0, 4).toUpperCase()}`;
            await Devolucion_Proveedor.create({
                id_devolucion_proveedor: id_devolucion,
                folio_devolucion,
                id_factura_proveedor: data.id_factura_proveedor,
                id_nc: (nc as any).id_nc,
                id_empresa: data.id_empresa,
                motivo,
                observaciones: data.observaciones?.trim() || null,
                subtotal, iva, total,
                id_empleado: data.id_empleado ?? null,
                usuario: data.usuario ?? null,
            } as any, { transaction: t });
            await Devolucion_Proveedor_Detalle.bulkCreate(aDevolver.map(({ l, cantidad }) => ({
                id_devolucion_detalle: uuidv4(),
                id_devolucion_proveedor: id_devolucion,
                id_factura_proveedor_detalle: l.id_detalle,
                id_articulo: l.id_articulo,
                id_lote_sucursal: l.id_lote_sucursal,
                descripcion_articulo: l.des_artic,
                numero_lote: l.numero_lote,
                fecha_caducidad: l.caducidad ? new Date(l.caducidad) : null,
                cantidad,
                precio_unitario: l.precio_neto,
                iva_unitario: l.iva_unitario,
            })) as any, { transaction: t });

            // 4) La factura queda "Con devolución" y lo recibido baja por lo devuelto (para que recibido + nota de crédito = total)
            const fac = await Factura_Compra_Proveedor.findByPk(data.id_factura_proveedor, { transaction: t, lock: t.LOCK.UPDATE });
            if (fac) {
                await fac.update({
                    estado_factura_proveedor: 'D',
                    total_recibido_factura: Math.max(0, r2(Number(fac.total_recibido_factura) - subtotal)),
                    total_iva_recibido_factura: Math.max(0, r2(Number(fac.total_iva_recibido_factura) - iva)),
                } as any, { transaction: t });
            }
            if (factura.id_compra_prove_factura) {
                await Compra_Proveedor.update({ estado_comp: 'D' }, { where: { id_comp: factura.id_compra_prove_factura }, transaction: t });
            }

            // 5) Cuenta por pagar: baja por lo devuelto; si ya se había pagado de más, queda anotado como saldo a favor
            const cxp = await Cuenta_Por_Pagar.findOne({ where: { id_factura_proveedor: data.id_factura_proveedor }, transaction: t, lock: t.LOCK.UPDATE });
            if (cxp) {
                const nuevoMonto = Math.max(0, r2(Number(cxp.monto_total) - total));
                const pagado = Number(cxp.monto_pagado) || 0;
                const nuevoSaldo = Math.max(0, r2(nuevoMonto - pagado));
                const aFavor = Math.max(0, r2(pagado - nuevoMonto));
                await cxp.update({
                    monto_total: nuevoMonto,
                    saldo_pendiente: nuevoSaldo,
                    estatus_cxp: nuevoSaldo <= 0 ? 'PAG' : (pagado > 0 ? 'PAR' : cxp.estatus_cxp),
                    notas: `${cxp.notas ?? ''}${cxp.notas ? ' | ' : ''}Devolución ${folio_devolucion}: -$${total.toFixed(2)}${aFavor > 0 ? ` (saldo a favor del proveedor: $${aFavor.toFixed(2)})` : ''}`.slice(0, 2000),
                } as any, { transaction: t });
            }

            await t.commit();

            // El documento sale a imprimir solo, con el recibo físico de la mercancía que se regresa
            const impresion = await imprimirDocumento(id_devolucion, folio_devolucion, data.id_empresa);
            return { id_devolucion_proveedor: id_devolucion, folio_devolucion, total, id_nc: (nc as any).id_nc, nota_credito_folio: (nc as any).folio_nc, impresion };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // Al CERRAR el chequeo de una factura con faltantes (estado "Con devolución"): se arma el documento de devolución con
    // lo que faltó y se manda a imprimir solo. Se llama después de que la factura ya quedó cerrada; no debe romper el cierre.
    registrarPorFaltantes: async (data: { id_factura_proveedor: string; id_empresa: string; id_empleado?: string | null; usuario?: string | null }) => {
        const MOTIVO = 'Faltante en recepción';
        const yaHecha = await Devolucion_Proveedor.findOne({ where: { id_factura_proveedor: data.id_factura_proveedor, motivo: MOTIVO } });
        if (yaHecha) return null;

        const faltantes = await dbLocal.query<any>(`
            SELECT f.id_articulo, f.id_nc, SUM(f.cantidad_faltante) AS cantidad, MAX(f.precio_unitario) AS precio, MAX(f.iva_unitario) AS iva,
                   a.des_artic
            FROM faltante_factura_proveedor f
            JOIN articulo a ON a.id_artic = f.id_articulo
            WHERE f.id_factura_proveedor = :f AND f.estado = 'P'
            GROUP BY f.id_articulo, f.id_nc, a.des_artic
            ORDER BY a.des_artic`,
            { replacements: { f: data.id_factura_proveedor }, type: QueryTypes.SELECT });
        if (!faltantes.length) return null;

        // Renglón de la factura de cada artículo (el detalle exige uno; si no se encuentra va el identificador vacío)
        const detalles = await dbLocal.query<any>(`
            SELECT d.id_factura_proveedor_detalle AS id_detalle, COALESCE(d.id_artic, dcs.idarticulo_detcompsol) AS id_articulo
            FROM detalle_factura_compra_proveedor d
            LEFT JOIN detalle_compra_solicitado dcs ON dcs.id_detcompsol = d.id_detcompsol
            WHERE d.id_factura_compra_proveedor = :f`,
            { replacements: { f: data.id_factura_proveedor }, type: QueryTypes.SELECT });
        const detPorArt = new Map<string, string>();
        for (const d of detalles) if (d.id_articulo && !detPorArt.has(String(d.id_articulo))) detPorArt.set(String(d.id_articulo), String(d.id_detalle));

        let subtotal = 0, iva = 0;
        for (const x of faltantes) { subtotal += Number(x.cantidad) * Number(x.precio); iva += Number(x.cantidad) * Number(x.iva); }
        subtotal = r2(subtotal); iva = r2(iva);

        const id_devolucion = uuidv4();
        const folio_devolucion = `DP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id_devolucion.slice(0, 4).toUpperCase()}`;
        const t = await dbLocal.transaction();
        try {
            await Devolucion_Proveedor.create({
                id_devolucion_proveedor: id_devolucion, folio_devolucion,
                id_factura_proveedor: data.id_factura_proveedor,
                id_nc: faltantes[0].id_nc ?? null,
                id_empresa: data.id_empresa,
                motivo: MOTIVO,
                observaciones: 'Generada automáticamente al cerrar el chequeo con faltantes.',
                subtotal, iva, total: r2(subtotal + iva),
                id_empleado: data.id_empleado ?? null, usuario: data.usuario ?? null,
            } as any, { transaction: t });
            await Devolucion_Proveedor_Detalle.bulkCreate(faltantes.map((x: any) => ({
                id_devolucion_detalle: uuidv4(),
                id_devolucion_proveedor: id_devolucion,
                id_factura_proveedor_detalle: detPorArt.get(String(x.id_articulo)) ?? '00000000-0000-0000-0000-000000000000',
                id_articulo: x.id_articulo,
                id_lote_sucursal: null,
                descripcion_articulo: String(x.des_artic ?? '').trim(),
                numero_lote: 'S/L',
                fecha_caducidad: null,
                cantidad: Number(x.cantidad),
                precio_unitario: Number(x.precio),
                iva_unitario: Number(x.iva),
            })) as any, { transaction: t });
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }
        const impresion = await imprimirDocumento(id_devolucion, folio_devolucion, data.id_empresa);
        return { id_devolucion_proveedor: id_devolucion, folio_devolucion, impresion };
    },

    historialPorFactura: async (id_factura: string) => {
        return await dbLocal.query<any>(`
            SELECT d.id_devolucion_proveedor, d.folio_devolucion, d.motivo, d.total, d."createdAt" AS fecha, d.usuario,
                   (SELECT COALESCE(SUM(x.cantidad), 0) FROM devolucion_proveedor_detalle x WHERE x.id_devolucion_proveedor = d.id_devolucion_proveedor) AS piezas
            FROM devolucion_proveedor d WHERE d.id_factura_proveedor = :f ORDER BY d."createdAt" DESC`,
            { replacements: { f: id_factura }, type: QueryTypes.SELECT });
    },

    pdf: async (id_devolucion: string): Promise<Buffer> => {
        const [cab] = await dbLocal.query<any>(`
            SELECT d.folio_devolucion, d.motivo, d.observaciones, d.subtotal, d.iva, d.total, d."createdAt" AS fecha, d.usuario,
                   f.folio_factura_proveedor AS folio_factura, p.nomcort_prove AS proveedor, p.razsoc_prove AS razon_social, p.rfc_prove AS rfc
            FROM devolucion_proveedor d
            JOIN factura_compra_proveedor f ON f.id_factura_proveedor = d.id_factura_proveedor
            LEFT JOIN compra_proveedor cp ON cp.id_comp = f.id_compra_prove_factura
            LEFT JOIN proveedor p ON p.id_prove = cp.idprove_comp
            WHERE d.id_devolucion_proveedor = :id`,
            { replacements: { id: id_devolucion }, type: QueryTypes.SELECT });
        if (!cab) throw errorNegocio('Devolución no encontrada.', 404);
        const renglones = await dbLocal.query<any>(`
            SELECT x.descripcion_articulo, a.cod_barr_artic, x.numero_lote, x.fecha_caducidad, x.cantidad, x.precio_unitario, x.iva_unitario
            FROM devolucion_proveedor_detalle x LEFT JOIN articulo a ON a.id_artic = x.id_articulo
            WHERE x.id_devolucion_proveedor = :id ORDER BY x.descripcion_articulo`,
            { replacements: { id: id_devolucion }, type: QueryTypes.SELECT });
        return generarPdfDevolucionProveedor({
            folio_devolucion: cab.folio_devolucion,
            fecha: cab.fecha,
            proveedor: cab.razon_social || cab.proveedor || '',
            rfc: cab.rfc ?? '',
            folio_factura: cab.folio_factura ?? '',
            motivo: cab.motivo,
            observaciones: cab.observaciones ?? '',
            usuario: cab.usuario ?? '',
            subtotal: Number(cab.subtotal), iva: Number(cab.iva), total: Number(cab.total),
            renglones: renglones.map((r: any) => ({
                articulo: String(r.descripcion_articulo ?? '').trim(),
                codigo: String(r.cod_barr_artic ?? '').trim(),
                lote: String(r.numero_lote ?? '').trim(),
                caducidad: r.fecha_caducidad ?? null,
                cantidad: Number(r.cantidad),
                precio: Number(r.precio_unitario),
                iva: Number(r.iva_unitario),
            })),
        });
    },
};
