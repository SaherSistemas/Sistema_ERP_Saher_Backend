import { col, fn, literal, Op } from 'sequelize';
import { GetConsultaBusquedaQueryDTO, GetResumenPromocionQueryDTO } from '../dto/GetResumenPromocionQueryDTO';
import { Pedido_AlmacenRepository } from '../../../Almacen/Pedido/repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../../../Almacen/Pedido/repositories/Detalle_Pedido_Almacen.repository';
import Lote_sucursal_articulo from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import { DetalleListaPreciosRepository } from '../../Precios/repositories/Detalle_Lista_Precio.repository';
import { Detalle_Compra_SolicitadoRepository } from '../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository';
import { Detalle_Compra_RecibidosRepository } from '../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Recibido.repository';
import { ICompraAgrupada } from '../../../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import LoteArticuloSucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';
import DetalleListaPrecio from '../../Precios/model/Detalle_Lista_Precio';
import Detalle_Pedido_Almacen from '../../../Almacen/Pedido/model/Detalle_Pedido_Almacen';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import { ArticuloRepository } from '../../../Catalogos/Articulos/repositories/Articulo.repository';
import { OfertaRepository } from '../../../../repository/Ofertas/Ofertas.repository';

type OfertaAplicada = {
    id_oferta: string;
    nombre_oferta: string;
    tipo_beneficio: string;
    valor: number | null;
    cantidad_minima: number | null;
    cantidad_regalo: number | null;
};

function buildOfertaMap(idsArticulos: string[], ofertas: any[]): Map<string, OfertaAplicada> {
    const map = new Map<string, OfertaAplicada>();
    for (const oferta of ofertas) {
        const alcances: any[] = oferta.get('alcances') ?? oferta.alcances ?? [];
        const reglas: any[] = oferta.get('reglas') ?? oferta.reglas ?? [];
        if (!reglas.length) continue;
        const regla = reglas[0];

        for (const alc of alcances) {
            const targets: string[] =
                alc.tipo_alcance === 'GLOBAL'
                    ? idsArticulos
                    : alc.tipo_alcance === 'ARTICULO' && alc.id_referencia
                        ? [alc.id_referencia]
                        : [];

            for (const id of targets) {
                if (!map.has(id)) {
                    map.set(id, {
                        id_oferta: oferta.id_oferta,
                        nombre_oferta: oferta.nombre_oferta,
                        tipo_beneficio: regla.tipo_beneficio,
                        valor: regla.valor ?? null,
                        cantidad_minima: regla.cantidad_minima ?? null,
                        cantidad_regalo: regla.cantidad_regalo ?? null,
                    });
                }
            }
        }
    }

    return map;
}

function calcPrecioOferta(precio: number | null, oferta: OfertaAplicada): number | null {
    if (precio === null) return null;
    if (oferta.tipo_beneficio === 'PORCENTAJE' && oferta.valor !== null) return Math.max(0, +(precio * (1 - oferta.valor / 100)).toFixed(2));
    if (oferta.tipo_beneficio === 'MONTO_FIJO' && oferta.valor !== null) return Math.max(0, +(precio - oferta.valor).toFixed(2));
    if (oferta.tipo_beneficio === 'BOGO') {
        const min = oferta.cantidad_minima ?? 2;
        const reg = oferta.cantidad_regalo ?? 1;
        return +(precio * (min - reg) / min).toFixed(2);
    }
    return null;
}

export const CatalogoComercialService = {
    getCatalagoComercialArticulosPromocionadosAlmacen: async (filters: GetResumenPromocionQueryDTO) => {

        const offset = (filters.page - 1) * filters.limit;

        // 1️⃣ Pedidos del cliente
        const pedidos = await Pedido_AlmacenRepository.getPedidosByClienteFacturados(filters.id_cliente);
        const idsPedidos = pedidos.map(p => p.id_pedido_alm);
        // console.log(pedidos)
        if (idsPedidos.length === 0) {
            return { items: [], totalPages: 0 };
        }

        // 2️⃣ Agrupar directamente en DB por artículo (evita reduce gigante en Node)
        const rowsAgrupadas = await Detalle_Pedido_Almacen.findAll({
            where: { id_pedido_almacen: { [Op.in]: idsPedidos } },

            attributes: [
                'id_articulo',
                [fn('SUM', col('cant_pedida')), 'cantidad_total'],
                // si existe la columna en la tabla:
                // [fn('SUM', col('cantidad_checada')), 'cantidad_total_checada'],
            ],

            include: [{
                model: Articulo,
                as: 'articulo',
                attributes: [
                    'id_artic',
                    'des_artic',
                    'des_gener_artic',
                    'tipo_de_iva',
                    'cod_int_artic'
                ],
                required: true,
            }],

            group: [
                'Detalle_Pedido_Almacen.id_articulo',
                'articulo.id_artic',
                'articulo.des_artic',
                'articulo.des_gener_artic',
                'articulo.tipo_de_iva',
                'articulo.cod_int_artic',
            ],

            // OJO: para ordenar por alias agregado, es mejor literal con raw:true
            order: [[literal('"cantidad_total"'), 'DESC']],

            limit: filters.limit,
            offset,
            subQuery: false,
            raw: true,
        });

        const totalDistinct = await Detalle_Pedido_Almacen.count({
            where: { id_pedido_almacen: { [Op.in]: idsPedidos } },
            distinct: true,
            col: 'id_articulo',
        });

        const totalPages = Math.ceil(totalDistinct / filters.limit);

        if (!rowsAgrupadas.length) {
            return { items: [], totalPages };
        }

        const idsArticulos = rowsAgrupadas.map(r => r.id_articulo);

        // 3️⃣ STOCK TOTAL (1 sola query)
        const stocks = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: filters.id_sucursal,
                id_articulo: { [Op.in]: idsArticulos },
            },
            attributes: [
                'id_articulo',
                [fn('COALESCE', fn('SUM', col('cantidad')), 0), 'existencia_total'],
                [fn('COALESCE', fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 0), 'existencia_disponible'],
            ],
            group: ['id_articulo'],
            raw: true,
        });

        const stockMap = new Map<string, { existencia_total: number; existencia_disponible: number }>();
        stocks.forEach((s: any) => {
            stockMap.set(s.id_articulo, {
                existencia_total: Number(s.existencia_total ?? 0),
                existencia_disponible: Number(s.existencia_disponible ?? 0),
            });
        });

        // 4️⃣ FECHA DE CADUCIDAD MÁS CORTA (1 sola query)
        const minFechas = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: filters.id_sucursal,
                id_articulo: { [Op.in]: idsArticulos },
            },
            attributes: [
                'id_articulo',
                [fn('MIN', col('lote.fecha_venci_lote_sucursal')), 'fechaMin'],
            ],
            include: [{
                model: LoteArticuloSucursal,
                as: 'lote',
                attributes: [],
                required: true,
            }],
            group: ['Stock_Ubicacion_Lote.id_articulo'],
            raw: true,
        });

        const minFechaMap = new Map<string, any>();
        minFechas.forEach((m: any) => {
            minFechaMap.set(m.id_articulo, m.fechaMin);
        });

        // 5️⃣ TRAER LOTES PARA RESOLVER NUMERO_Lote (1 query)
        const lotes = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: filters.id_sucursal,
                id_articulo: { [Op.in]: idsArticulos },
            },
            attributes: ['id_articulo'],
            include: [{
                model: LoteArticuloSucursal,
                as: 'lote',
                attributes: ['numero_lote_sucursal', 'fecha_venci_lote_sucursal'],
                required: true,
            }],
            raw: true,
        });

        const loteMap = new Map<string, { fecha: any; numero: any }>();

        for (const r of lotes as any[]) {
            const id = r.id_articulo;
            const fecha = r['lote.fecha_venci_lote_sucursal'];
            const min = minFechaMap.get(id);

            if (!min) continue;

            if (String(fecha) === String(min) && !loteMap.has(id)) {
                loteMap.set(id, {
                    fecha,
                    numero: r['lote.numero_lote_sucursal'],
                });
            }
        }

        // 6️⃣ PRECIOS (1 query)
        const preciosRows = await DetalleListaPrecio.findAll({
            where: {
                id_artic: { [Op.in]: idsArticulos },
                id_lista_precio: filters.grupoPrecio,
            },
            attributes: ['id_artic', 'precios'],
            raw: true,
        });

        const precioMap = new Map<string, number | null>();
        preciosRows.forEach((p: any) => {
            const val = Number(p.precios);
            // Si el precio es menor a 1 centavo se trata como sin precio
            precioMap.set(p.id_artic, val >= 0.01 ? val : null);
        });

        // 6b️⃣ OFERTAS ACTIVAS
        const ofertasActivas = await OfertaRepository.getOfertasSucursal({ id_empre: filters.id_sucursal, fecha: new Date() });
        const ofertaMap = buildOfertaMap(idsArticulos, ofertasActivas);

        // 7️⃣ TRANSITO (1 query)
        const transitoRows = await Detalle_Compra_Solicitado.findAll({
            where: { idarticulo_detcompsol: { [Op.in]: idsArticulos } },
            include: [{
                model: Compra_Proveedor,
                required: true,
                where: {
                    estado_comp: {
                        [Op.in]: ['C', 'A', 'E', 'L', 'K']
                    }
                },
                attributes: []
            }],
            attributes: [
                'idarticulo_detcompsol',
                [fn('SUM', col('cantidad_detcompsol')), 'transito'],
            ],
            group: ['idarticulo_detcompsol'],
            raw: true,
        });

        const transitoMap = new Map<string, number>();
        transitoRows.forEach((t: any) => {
            transitoMap.set(t.idarticulo_detcompsol, Number(t.transito ?? 0));
        });

        // 8️⃣ PEDIDOS CAPTURADOS (en estado CA)
        const capturadoRows = await Detalle_Pedido_Almacen.findAll({
            where: { id_articulo: { [Op.in]: idsArticulos } },
            include: [{
                model: Pedido_Almacen,
                required: true,
                where: { status_pedido_alm: 'CA' },
                attributes: [],
            }],
            attributes: [
                'id_articulo',
                [fn('SUM', col('cant_pedida')), 'capturado'],
            ],
            group: ['id_articulo'],
            raw: true,
        });

        const capturadoMap = new Map<string, number>();
        capturadoRows.forEach((c: any) => {
            capturadoMap.set(c.id_articulo, Number(c.capturado ?? 0));
        });

        // 9️⃣ ARMAR RESULTADO FINAL
        const resultado = rowsAgrupadas.map((r: any) => {

            const id_artic = r['articulo.id_artic'];

            const stock = stockMap.get(id_artic) ?? {
                existencia_total: 0,
                existencia_disponible: 0
            };

            const lote = loteMap.get(id_artic);
            const precio = precioMap.has(id_artic) ? precioMap.get(id_artic)! : null;
            const oferta = ofertaMap.get(id_artic) ?? null;

            return {
                id_artic,
                descripcion: r['articulo.des_artic'],
                descripcion_generica: r['articulo.des_gener_artic'],
                iva: r['articulo.tipo_de_iva'],
                codigo_interno: r['articulo.cod_int_artic'],

                existencia_total: stock.existencia_total,
                existencia_disponible: stock.existencia_disponible,

                fecha_caduca_mas_corta: lote?.fecha ?? null,
                lote_mas_corto: lote?.numero ?? null,

                precio,
                oferta: oferta ? {
                    id_oferta: oferta.id_oferta,
                    nombre_oferta: oferta.nombre_oferta,
                    tipo_beneficio: oferta.tipo_beneficio,
                    valor: oferta.valor,
                    cantidad_minima: oferta.cantidad_minima,
                    cantidad_regalo: oferta.cantidad_regalo,
                    precio_oferta: calcPrecioOferta(precio, oferta),
                } : null,

                cantidad_total: Number(r.cantidad_total ?? 0),
                cantidad_total_checada: Number(r.cantidad_total_checada ?? 0),

                transito: transitoMap.get(id_artic) ?? 0,
                pedidos_capturado: capturadoMap.get(id_artic) ?? 0,
            };
        });

        return { items: resultado, totalPages };
    },
    getCatalagoComercialArticulosBusqueda: async (filters: GetConsultaBusquedaQueryDTO) => {
        const page = Math.max(1, Number(filters.page || 1));
        const limit = Math.max(1, Number(filters.limit || 10));
        const offset = (page - 1) * limit;

        const nombre = String(filters.nombre ?? "").trim();
        if (!nombre) {
            return { items: [], totalPages: 0, total: 0 };
        }

        const total = await ArticuloRepository.countBusqueda(filters.nombre)


        const totalPages = Math.ceil(total / limit);
        if (total === 0) {
            return { items: [], totalPages: 0, total: 0 };
        }

        // 2) Traer artículos paginados con existencias (LEFT JOIN stock)
        //    ✅ si no hay stock: SUM = null -> COALESCE(...,0)

        const rows = await ArticuloRepository.getBusquedaPaginadaVenta(nombre, filters.id_sucursal, page, limit);

        const idsArticulos = rows.map((r: any) => r.id_artic);
        if (!idsArticulos.length) return { items: [], totalPages, total };

        // 3) Lote más corto (solo si hay disponible > 0)
        const minFechas = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: filters.id_sucursal,
                id_articulo: { [Op.in]: idsArticulos },
            },
            attributes: [
                "id_articulo",
                [fn("MIN", col("lote.fecha_venci_lote_sucursal")), "fechaMin"],
            ],
            include: [
                {
                    model: LoteArticuloSucursal,
                    as: "lote",
                    attributes: [],
                    required: true,
                },
            ],
            group: ["Stock_Ubicacion_Lote.id_articulo"],
            having: literal(
                `SUM("Stock_Ubicacion_Lote"."cantidad" - COALESCE("Stock_Ubicacion_Lote"."cantidad_apartada", 0)) > 0`
            ),
            raw: true,
            subQuery: false,
        });

        const minFechaMap = new Map<string, any>();
        for (const m of minFechas as any[]) {
            minFechaMap.set(m.id_articulo, m.fechaMin);
        }

        const lotes = await Stock_Ubicacion_Lote.findAll({
            where: {
                id_empresa_sucursal: filters.id_sucursal,
                id_articulo: { [Op.in]: idsArticulos },
            },
            attributes: ["id_articulo"],
            include: [
                {
                    model: LoteArticuloSucursal,
                    as: "lote",
                    attributes: ["numero_lote_sucursal", "fecha_venci_lote_sucursal"],
                    required: true,
                },
            ],
            raw: true,
            subQuery: false,
        });

        const loteMap = new Map<string, { fecha: any; numero: any }>();
        for (const r of lotes as any[]) {
            const id = r.id_articulo;
            const min = minFechaMap.get(id);
            if (!min) continue;

            const fecha = r["lote.fecha_venci_lote_sucursal"];
            if (String(fecha) === String(min) && !loteMap.has(id)) {
                loteMap.set(id, { fecha, numero: r["lote.numero_lote_sucursal"] });
            }
        }

        // 4) Precio
        const preciosRows = await DetalleListaPrecio.findAll({
            where: {
                id_artic: { [Op.in]: idsArticulos },
                id_lista_precio: filters.grupoPrecio,
            },
            attributes: ["id_artic", "precios"],
            raw: true,
        });

        const precioMap = new Map<string, number | null>();
        for (const p of preciosRows as any[]) {
            const val = Number(p.precios);
            // Si el precio es menor a 1 centavo se trata como sin precio
            precioMap.set(p.id_artic, val >= 0.01 ? val : null);
        }

        // 4b) Ofertas activas
        const ofertasActivas = await OfertaRepository.getOfertasSucursal({ id_empre: filters.id_sucursal, fecha: new Date(), canal: 'ONLINE' });
        // console.log("Ofertas activas:", ofertasActivas);
        const ofertaMap = buildOfertaMap(idsArticulos, ofertasActivas);
        //  console.log("Mapa de ofertas:", ofertaMap);
        // 5) Tránsito
        const transitoRows = await Detalle_Compra_Solicitado.findAll({
            where: { idarticulo_detcompsol: { [Op.in]: idsArticulos } },
            include: [
                {
                    model: Compra_Proveedor,
                    required: true,
                    where: { estado_comp: { [Op.in]: ["C", "A", "E", "L", "K"] } },
                    attributes: [],
                },
            ],
            attributes: [
                "idarticulo_detcompsol",
                [fn("SUM", col("cantidad_detcompsol")), "transito"],
            ],
            group: ["idarticulo_detcompsol"],
            raw: true,
        });

        const transitoMap = new Map<string, number>();
        for (const t of transitoRows as any[]) {
            transitoMap.set(t.idarticulo_detcompsol, Number(t.transito ?? 0));
        }

        // 6) Pedidos capturados (estado CA)
        const capturadoRowsBusq = await Detalle_Pedido_Almacen.findAll({
            where: { id_articulo: { [Op.in]: idsArticulos } },
            include: [{
                model: Pedido_Almacen,
                required: true,
                where: { status_pedido_alm: { [Op.in]: ['CA', 'SU'] }, },
                attributes: [],
            }],
            attributes: [
                'id_articulo',
                [fn('SUM', col('cant_pedida')), 'capturado'],
            ],
            group: ['id_articulo'],
            raw: true,
        });

        const capturadoMapBusq = new Map<string, number>();
        for (const c of capturadoRowsBusq as any[]) {
            capturadoMapBusq.set(c.id_articulo, Number(c.capturado ?? 0));
        }

        // 7) Armar salida (respetando el orden de rows)
        const items = (rows as any[]).map(r => {
            const id_artic = r.id_artic;
            const lote = loteMap.get(id_artic);
            const precio = precioMap.has(id_artic) ? precioMap.get(id_artic)! : null;
            const oferta = ofertaMap.get(id_artic) ?? null;

            return {
                id_artic,
                descripcion: r.des_artic,
                descripcion_generica: r.des_gener_artic,
                iva: r.tipo_de_iva,
                codigo_interno: r.cod_int_artic,

                existencia_total: Number(r.existencia_total ?? 0),
                existencia_disponible: Number(r.existencia_disponible ?? 0),

                fecha_caduca_mas_corta: lote?.fecha ?? null,
                lote_mas_corto: lote?.numero ?? null,

                precio,
                oferta: oferta ? {
                    id_oferta: oferta.id_oferta,
                    nombre_oferta: oferta.nombre_oferta,
                    tipo_beneficio: oferta.tipo_beneficio,
                    valor: oferta.valor,
                    cantidad_minima: oferta.cantidad_minima,
                    cantidad_regalo: oferta.cantidad_regalo,
                    precio_oferta: calcPrecioOferta(precio, oferta),
                } : null,

                transito: transitoMap.get(id_artic) ?? 0,
                pedidos_capturado: capturadoMapBusq.get(id_artic) ?? 0,
            };
        });

        return { items, totalPages, total };
    },

    getCatalogoArticulosConOferta: async (filters: { id_sucursal: string; grupoPrecio: string }) => {
        // 1️⃣ Ofertas activas ahora mismo
        const ofertasActivas = await OfertaRepository.getOfertasSucursal({ id_empre: filters.id_sucursal, fecha: new Date() });

        // 2️⃣ Extraer ids de artículos referenciados en alcances ARTICULO
        const idsArticulos: string[] = [];
        for (const oferta of ofertasActivas) {
            const alcances: any[] = oferta.get('alcances') ?? oferta.alcances ?? [];
            for (const alc of alcances) {
                if (alc.tipo_alcance === 'ARTICULO' && alc.id_referencia) {
                    idsArticulos.push(alc.id_referencia);
                }
            }
        }

        if (!idsArticulos.length) return { items: [] };

        // 3️⃣ Traer artículos
        const articulos = await Articulo.findAll({
            where: { id_artic: { [Op.in]: idsArticulos } },
            attributes: ['id_artic', 'des_artic', 'des_gener_artic', 'tipo_de_iva', 'cod_int_artic'],
            raw: true,
        });

        // 4️⃣ Stock
        const stocks = await Stock_Ubicacion_Lote.findAll({
            where: { id_empresa_sucursal: filters.id_sucursal, id_articulo: { [Op.in]: idsArticulos } },
            attributes: [
                'id_articulo',
                [fn('COALESCE', fn('SUM', col('cantidad')), 0), 'existencia_total'],
                [fn('COALESCE', fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 0), 'existencia_disponible'],
            ],
            group: ['id_articulo'],
            raw: true,
        });
        const stockMap = new Map<string, any>();
        stocks.forEach((s: any) => stockMap.set(s.id_articulo, s));

        // 5️⃣ Lote más corto
        const minFechas = await Stock_Ubicacion_Lote.findAll({
            where: { id_empresa_sucursal: filters.id_sucursal, id_articulo: { [Op.in]: idsArticulos } },
            attributes: ['id_articulo', [fn('MIN', col('lote.fecha_venci_lote_sucursal')), 'fechaMin']],
            include: [{ model: LoteArticuloSucursal, as: 'lote', attributes: [], required: true }],
            group: ['Stock_Ubicacion_Lote.id_articulo'],
            raw: true,
        });
        const minFechaMap = new Map<string, any>();
        (minFechas as any[]).forEach(m => minFechaMap.set(m.id_articulo, m.fechaMin));

        const lotes = await Stock_Ubicacion_Lote.findAll({
            where: { id_empresa_sucursal: filters.id_sucursal, id_articulo: { [Op.in]: idsArticulos } },
            attributes: ['id_articulo'],
            include: [{ model: LoteArticuloSucursal, as: 'lote', attributes: ['numero_lote_sucursal', 'fecha_venci_lote_sucursal'], required: true }],
            raw: true,
        });
        const loteMap = new Map<string, { fecha: any; numero: any }>();
        for (const r of lotes as any[]) {
            const min = minFechaMap.get(r.id_articulo);
            if (!min) continue;
            if (String(r['lote.fecha_venci_lote_sucursal']) === String(min) && !loteMap.has(r.id_articulo)) {
                loteMap.set(r.id_articulo, { fecha: r['lote.fecha_venci_lote_sucursal'], numero: r['lote.numero_lote_sucursal'] });
            }
        }

        // 6️⃣ Precios
        const preciosRows = await DetalleListaPrecio.findAll({
            where: { id_artic: { [Op.in]: idsArticulos }, id_lista_precio: filters.grupoPrecio },
            attributes: ['id_artic', 'precios'],
            raw: true,
        });
        const precioMap = new Map<string, number | null>();
        (preciosRows as any[]).forEach(p => {
            const val = Number(p.precios);
            precioMap.set(p.id_artic, val >= 0.01 ? val : null);
        });

        // 7️⃣ Mapa de ofertas
        const ofertaMap = buildOfertaMap(idsArticulos, ofertasActivas);

        // 8️⃣ Resultado
        const items = (articulos as any[]).map(a => {
            const id_artic = a.id_artic;
            const stock = stockMap.get(id_artic);
            const lote = loteMap.get(id_artic);
            const precio = precioMap.get(id_artic) ?? null;
            const oferta = ofertaMap.get(id_artic) ?? null;

            return {
                id_artic,
                descripcion: a.des_artic,
                descripcion_generica: a.des_gener_artic,
                iva: a.tipo_de_iva,
                codigo_interno: a.cod_int_artic,
                existencia_total: Number(stock?.existencia_total ?? 0),
                existencia_disponible: Number(stock?.existencia_disponible ?? 0),
                fecha_caduca_mas_corta: lote?.fecha ?? null,
                lote_mas_corto: lote?.numero ?? null,
                precio,
                oferta: oferta ? {
                    id_oferta: oferta.id_oferta,
                    nombre_oferta: oferta.nombre_oferta,
                    tipo_beneficio: oferta.tipo_beneficio,
                    valor: oferta.valor,
                    cantidad_minima: oferta.cantidad_minima,
                    cantidad_regalo: oferta.cantidad_regalo,
                    precio_oferta: calcPrecioOferta(precio, oferta),
                } : null,
                transito: 0,
            };
        });

        return { items };
    },
};
