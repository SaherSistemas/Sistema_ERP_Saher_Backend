import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Entrada_Inventario_Factura_Detalle from '../model/Entrada_Inventario_Factura_Detalle';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import Compra_General from '../../../Compras/Ordenes-Compra/model/Compra_General';
import Detalle_Compra_Recibido from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Recibido';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';
import LotesRecibidosCompra from '../../../../models/LotesYCaducidad/LotesRecibidosCompra';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import Kardex_Movimientos_Articulos from '../../../Almacen/Kardex/model/Kardex_Movimientos_Articulos';

/**
 * Entrada al inventario de la mercancía de una factura de proveedor, al CHECAR cada renglón.
 *
 * - Se compara lo que debe haber entrado (los lotes recibidos del renglón) contra lo que ya entró
 *   (`entrada_inventario_factura_detalle`) y se aplica solo la DIFERENCIA: así guardar dos veces el mismo renglón o
 *   corregirlo después no duplica existencias.
 * - Entradas: stock SIN UBICACIÓN (pendiente de acomodo) + Kardex ENTRADA.
 * - Bajas (corrección a menos): solo se pueden quitar piezas libres (no apartadas por pedidos); si no alcanzan se avisa
 *   y no se cambia nada (la transacción se revierte).
 * - Al finalizar la factura se vuelve a llamar con los lotes finales: lo ya entrado no se repite; lo que no hubiera
 *   entrado (renglones checados antes de este cambio) entra en ese momento.
 */

type LoteDeseado = { numero: string; caducidad: string | null; cantidad: number; id_loterecibido: string | null };

const errorNegocio = (mensaje: string) => Object.assign(new Error(mensaje), { status: 409, expose: true });

interface ParamsDelta {
    id_detalle: string;
    id_factura: string;
    id_articulo: string;
    id_empresa: string;
    esTraslado: boolean;
    precio: number;
    deseados: LoteDeseado[];
    id_empleado?: string | null;
    t: Transaction;
}

async function registrarKardex(p: ParamsDelta, id_lote: string, tipo: 'ENTRADA' | 'SALIDA', cantidad: number, notas: string) {
    if (!p.id_empleado) return;   // el Kardex exige empleado; sin él no se puede registrar el movimiento
    await Kardex_Movimientos_Articulos.create({
        id_empresa: p.id_empresa,
        fecha: new Date(),
        id_articulo: p.id_articulo,
        id_lote,
        tipo_movimiento: tipo,
        categoria: 'Entrada_Salida',
        id_origen_ubicacion: null,
        id_destino_ubicacion: null,
        cantidad_movimiento: cantidad,
        documento_ref: p.id_factura,
        id_pedido: null,
        id_empleado: p.id_empleado,
        notas,
    } as any, { transaction: p.t });
}

async function entrar(p: ParamsDelta, id_lote: string, cantidad: number, notas: string) {
    console.log("[EntradaInv] ENTRAR", cantidad, "pz | lote", id_lote, "| empresa", p.id_empresa);
    const fila = await Stock_Ubicacion_Lote.findOne({
        where: { id_empresa_sucursal: p.id_empresa, id_articulo: p.id_articulo, id_lote, id_ubicacion_sucursal: null as any },
        transaction: p.t,
        lock: p.t.LOCK.UPDATE,
    });
    if (fila) {
        await fila.update({ cantidad: Number(fila.cantidad) + cantidad }, { transaction: p.t });
    } else {
        await Stock_Ubicacion_Lote.create({
            id_stock_ubicacion_lote: uuidv4(),
            id_empresa_sucursal: p.id_empresa,
            id_articulo: p.id_articulo,
            id_lote,
            id_ubicacion_sucursal: null,
            cantidad,
            cantidad_apartada: 0,
        } as any, { transaction: p.t });
    }
    await registrarKardex(p, id_lote, 'ENTRADA', cantidad, notas);
}

async function sacar(p: ParamsDelta, id_lote: string, numero: string, cantidad: number, notas: string) {
    const filas = await Stock_Ubicacion_Lote.findAll({
        where: { id_empresa_sucursal: p.id_empresa, id_articulo: p.id_articulo, id_lote },
        transaction: p.t,
        lock: p.t.LOCK.UPDATE,
    });
    // Primero lo que sigue SIN UBICACIÓN (lo que acaba de entrar), luego lo demás de mayor a menor
    filas.sort((a, b) =>
        (a.id_ubicacion_sucursal ? 1 : 0) - (b.id_ubicacion_sucursal ? 1 : 0)
        || Number(b.cantidad) - Number(a.cantidad));

    let falta = cantidad;
    for (const f of filas) {
        if (falta <= 0) break;
        const libre = Math.max(0, Number(f.cantidad) - (Number(f.cantidad_apartada) || 0));
        const quitar = Math.min(libre, falta);
        if (quitar <= 0) continue;
        const nueva = Number(f.cantidad) - quitar;
        if (nueva <= 0 && !(Number(f.cantidad_apartada) > 0)) await f.destroy({ transaction: p.t });
        else await f.update({ cantidad: nueva }, { transaction: p.t });
        falta -= quitar;
    }
    if (falta > 0) {
        throw errorNegocio(
            `No se pueden quitar ${cantidad} pz del lote ${numero}: ${falta} ya están apartadas por un pedido o ya salieron del almacén. ` +
            `No se guardó ningún cambio.`
        );
    }
    await registrarKardex(p, id_lote, 'SALIDA', cantidad, notas);
}

async function aplicarDelta(p: ParamsDelta) {
    const { t } = p;

    // Lo deseado, fusionado por número de lote
    const deseado = new Map<string, LoteDeseado>();
    for (const l of p.deseados) {
        const numero = String(l.numero ?? '').trim();
        if (!numero || !(Number(l.cantidad) > 0)) continue;
        const previo = deseado.get(numero);
        if (previo) previo.cantidad += Number(l.cantidad);
        else deseado.set(numero, { ...l, numero, cantidad: Number(l.cantidad) });
    }

    const yaEntrado = await Entrada_Inventario_Factura_Detalle.findAll({
        where: { id_factura_proveedor_detalle: p.id_detalle },
        transaction: t,
        lock: t.LOCK.UPDATE,
    });
    const porLote = new Map(yaEntrado.map(f => [f.id_lote_sucursal, f]));
    const lotesPrevios = yaEntrado.length
        ? await Lote_Articulo_Sucursal.findAll({ where: { id_lote_sucursal: { [Op.in]: yaEntrado.map(f => f.id_lote_sucursal) } }, transaction: t })
        : [];
    const numeroDe = new Map(lotesPrevios.map(l => [l.id_lote_sucursal, String(l.numero_lote_sucursal ?? '').trim()]));

    const lotesTocados = new Set<string>();
    console.log("[EntradaInv] detalle", p.id_detalle, "| artículo", p.id_articulo, "| empresa", p.id_empresa,
        "| deseado:", JSON.stringify(Array.from(deseado.values()).map(l => ({ lote: l.numero, cant: l.cantidad }))),
        "| ya entrado:", JSON.stringify(yaEntrado.map(f => ({ lote: f.id_lote_sucursal, cant: f.cantidad }))));

    // 1) Lotes que deben tener entrada: alta del lote si no existe y diferencia contra lo ya entrado
    for (const [numero, l] of deseado) {
        let lote = await Lote_Articulo_Sucursal.findOne({
            where: { id_artic: p.id_articulo, id_empre: p.id_empresa, numero_lote_sucursal: numero },
            transaction: t,
        });
        if (!lote) {
            lote = await Lote_Articulo_Sucursal.create({
                id_lote_sucursal: uuidv4(),
                id_artic: p.id_articulo,
                id_empre: p.id_empresa,
                numero_lote_sucursal: numero,
                fecha_venci_lote_sucursal: l.caducidad ? new Date(l.caducidad) : null,
                cantidad_entrada_lote: l.cantidad,
                precio_costo_lote_sucursal: p.precio,
                estado_lote_sucursal: 'A',
                id_loterecibido_lote_sucursal: l.id_loterecibido,
            } as any, { transaction: t });
        } else {
            await lote.update({
                cantidad_entrada_lote: l.cantidad,
                estado_lote_sucursal: 'A',
                ...(p.esTraslado ? {} : { precio_costo_lote_sucursal: p.precio }),
                ...(lote.id_loterecibido_lote_sucursal ? {} : { id_loterecibido_lote_sucursal: l.id_loterecibido }),
            } as any, { transaction: t });
        }
        lotesTocados.add(lote.id_lote_sucursal);

        const previo = porLote.get(lote.id_lote_sucursal);
        const entrado = previo ? Number(previo.cantidad) : 0;
        const delta = l.cantidad - entrado;
        console.log("[EntradaInv] lote", numero, "→ id", lote.id_lote_sucursal, "| entrado", entrado, "| deseado", l.cantidad, "| delta", delta);

        if (delta > 0) {
            await entrar(p, lote.id_lote_sucursal, delta,
                entrado > 0 ? 'Corrección de recepción de factura proveedor (aumento)' : 'Recepción factura proveedor');
        } else if (delta < 0) {
            await sacar(p, lote.id_lote_sucursal, numero, -delta, 'Corrección de recepción de factura proveedor (disminución)');
        }

        if (previo) await previo.update({ cantidad: l.cantidad }, { transaction: t });
        else {
            await Entrada_Inventario_Factura_Detalle.create({
                id_entrada: uuidv4(),
                id_factura_proveedor_detalle: p.id_detalle,
                id_lote_sucursal: lote.id_lote_sucursal,
                id_articulo: p.id_articulo,
                id_empresa: p.id_empresa,
                cantidad: l.cantidad,
            } as any, { transaction: t });
        }
    }

    // 2) Lotes que ya habían entrado y ya no están en el renglón (se quitó o se cambió el lote)
    for (const f of yaEntrado) {
        if (lotesTocados.has(f.id_lote_sucursal)) continue;
        await sacar(p, f.id_lote_sucursal, numeroDe.get(f.id_lote_sucursal) ?? f.id_lote_sucursal, Number(f.cantidad),
            'Corrección de recepción de factura proveedor (lote cambiado o quitado)');
        await f.destroy({ transaction: t });
    }
}

export const EntradaInventarioFacturaService = {

    // Cuántas piezas de este renglón ya entraron (para no contarlas dos veces en el costo promedio al corregir)
    cantidadYaEntrada: async (id_detalle: string, t: Transaction): Promise<number> => {
        const filas = await Entrada_Inventario_Factura_Detalle.findAll({ where: { id_factura_proveedor_detalle: id_detalle }, transaction: t });
        return filas.reduce((s, f) => s + Number(f.cantidad), 0);
    },

    // Antes de reemplazar los lotes recibidos de un renglón: los lotes del inventario que apuntan a un lote recibido
    // que va a desaparecer se desligan (el lote recibido se borra y recrea con otro id al corregir).
    liberarReferenciasDeLotesQueSeQuitan: async (id_detalle: string, idsQueSeQuedan: string[], t: Transaction) => {
        const dr = await Detalle_Compra_Recibido.findOne({ where: { id_detalle_factura_compra_proveedor: id_detalle }, transaction: t });
        if (!dr) return;
        const actuales = await LotesRecibidosCompra.findAll({ where: { id_detallecompr_recibido: dr.id_detcomprec }, transaction: t });
        const seQuitan = actuales.map((l: any) => l.id_loterecibido).filter((id: string) => !idsQueSeQuedan.includes(id));
        if (!seQuitan.length) return;
        await Lote_Articulo_Sucursal.update(
            { id_loterecibido_lote_sucursal: null } as any,
            { where: { id_loterecibido_lote_sucursal: { [Op.in]: seQuitan } }, transaction: t },
        );
    },

    // Datos comunes del renglón: artículo real, precio, empresa donde entra y si es traslado
    cargarContexto: async (id_detalle: string, t: Transaction) => {
        const detalle = await Detalle_Factura_Compra_Proveedor.findByPk(id_detalle, { transaction: t });
        if (!detalle) throw new Error('Detalle de factura no encontrado.');

        const factura: any = await Factura_Compra_Proveedor.findByPk(detalle.id_factura_compra_proveedor, {
            attributes: ['id_factura_proveedor', 'tipo_origen', 'id_empresa_receptora'],
            include: [{
                model: Compra_Proveedor,
                as: 'compra',
                attributes: ['id_comp'],
                include: [{ model: Compra_General, attributes: ['id_compra_general', 'id_empresa_sucursal'] }],
            }],
            transaction: t,
        });
        if (!factura) throw new Error('Factura no encontrada.');

        const esTraslado = factura.tipo_origen === 'TRASLADO';
        const id_empresa = esTraslado ? factura.id_empresa_receptora : factura.compra?.compra_general?.id_empresa_sucursal;

        let id_articulo: string | null = (detalle as any).id_artic ?? null;
        if (!id_articulo && (detalle as any).id_detcompsol) {
            const sol = await Detalle_Compra_Solicitado.findByPk((detalle as any).id_detcompsol, { transaction: t });
            id_articulo = sol?.idarticulo_detcompsol ?? null;
        }
        return {
            id_factura: factura.id_factura_proveedor as string,
            esTraslado,
            id_empresa: id_empresa as string,
            id_articulo,
            precio: Number((detalle as any).precio_articulo_factura ?? 0),
        };
    },

    // AL GUARDAR EL CHEQUEO de un renglón: lo que debe haber entrado son sus lotes recibidos recién guardados
    sincronizarDesdeRecibidos: async (id_detalle: string, id_empleado: string | null, t: Transaction) => {
        const ctx = await EntradaInventarioFacturaService.cargarContexto(id_detalle, t);
        if (!ctx.id_articulo || !ctx.id_empresa) {
            console.warn("[EntradaInv] NO se dio entrada al checar: falta dato — artículo:", ctx.id_articulo, "| empresa:", ctx.id_empresa, "| detalle", id_detalle);
            return;
        }

        const dr = await Detalle_Compra_Recibido.findOne({ where: { id_detalle_factura_compra_proveedor: id_detalle }, transaction: t });
        const lotes = dr
            ? await LotesRecibidosCompra.findAll({ where: { id_detallecompr_recibido: dr.id_detcomprec }, transaction: t })
            : [];

        console.log("[EntradaInv] sincronizarDesdeRecibidos: lotes recibidos encontrados:", lotes.length, "| detalle", id_detalle);
        await aplicarDelta({
            id_detalle,
            id_factura: ctx.id_factura,
            id_articulo: ctx.id_articulo,
            id_empresa: ctx.id_empresa,
            esTraslado: ctx.esTraslado,
            precio: ctx.precio,
            deseados: lotes.map((l: any) => ({
                numero: l.numerolote_lote,
                caducidad: l.fechavencimiento_lote ?? null,
                cantidad: Number(l.cantidad_lote) || 0,
                id_loterecibido: l.id_loterecibido ?? null,
            })),
            id_empleado,
            t,
        });
    },

    // AL FINALIZAR la factura: lo ya entrado no se repite; lo que no hubiera entrado (checado antes de este cambio) entra ahora
    sincronizarDesdeFinales: async (p: {
        d: any; id_factura: string; id_empresa: string; esTraslado: boolean; id_empleado: string | null; t: Transaction;
    }) => {
        const { d } = p;
        const id_articulo = p.esTraslado
            ? (d.articulo?.id_artic ?? d.id_artic)
            : (d.id_artic ?? d.detalleCompraSolicitado?.idarticulo_detcompsol);
        if (!id_articulo || !p.id_empresa) return;

        const recibido = Number(d?.resumen?.recibido ?? 0);
        const lotes = recibido > 0 && Array.isArray(d.lotes_finales) ? d.lotes_finales : [];
        console.log("[EntradaInv] sincronizarDesdeFinales (al cerrar): detalle", d.id_factura_proveedor_detalle, "| recibido", recibido, "| lotes", lotes.length);

        await aplicarDelta({
            id_detalle: d.id_factura_proveedor_detalle,
            id_factura: p.id_factura,
            id_articulo,
            id_empresa: p.id_empresa,
            esTraslado: p.esTraslado,
            precio: Number(d.precio_articulo_factura ?? 0),
            deseados: lotes.map((l: any) => ({
                numero: l.numerolote_lote ?? l.numero_lote,
                caducidad: l.fechavencimiento_lote ?? l.fecha_caducidad ?? null,
                cantidad: Number(l.cantidad_lote ?? 0),
                id_loterecibido: l.id_loterecibido ?? l.id_lote ?? null,
            })),
            id_empleado: p.id_empleado,
            t: p.t,
        });
    },
};
