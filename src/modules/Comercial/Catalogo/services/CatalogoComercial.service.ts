import { col, fn, literal, Op } from 'sequelize';
import { LotesArticuloSucursalRepository } from '../../../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository';
import { GetResumenPromocionQueryDTO } from '../dto/GetResumenPromocionQueryDTO';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../../Pedido/repositories/Detalle_Pedido_Almacen.repository';
import Lote_sucursal_articulo from '../../../../models/LotesYCaducidad/Lote_ArticuloSucursal';
import { DetalleListaPreciosRepository } from '../../Precios/repositories/Detalle_Lista_Precio.repository';
import { Detalle_Compra_SolicitadoRepository } from '../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository';
import { Detalle_Compra_RecibidosRepository } from '../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Recibido.repository';
import { ICompraAgrupada } from '../../../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface';
import Stock_Ubicacion_Lote from '../../../Inventario/Stock/model/Stock_Ubicacion_Lote';
import LoteArticuloSucursal from '../../../../models/LotesYCaducidad/Lote_ArticuloSucursal';
export const CatalogoComercialService = {
    getCatalagoComercialArticulosPromocionadosAlmacen: async (filters: GetResumenPromocionQueryDTO) => {
        //!PENDIENTE MAÑANA 
        /*0FALTA CAMBIAR A QUE SE VAYA A STOCK_UBICACION_LOTE PORQUE AHI ESTARA LA UBICACION YA QUE AHROA EN LOTE ARTIUCLO SUCURSAL SOLO ESTARA EL LOTE, FECHA DE CADUCIADA Y ASI  */
        const offset = (filters.page - 1) * filters.limit;
        const pedidos = await Pedido_AlmacenRepository.getPedidosByClienteFacturados(filters.id_cliente);
        const ids = pedidos.map(p => p.id_pedido_alm);

        if (ids.length === 0) {
            return { items: [], totalPages: 0 };
        }

        // 2. Detalles + artículos
        const detallesTodos = await Promise.all(ids.map(id => Detalle_Pedido_AlmacenRepository.findByIDPedido(id)));

        const detalles = detallesTodos.flat();

        const comprasAgrupadas: Record<string, ICompraAgrupada> = detalles.reduce((acc, det) => {
            const articulo = det.dataValues.articulo.dataValues;
            const id = det.id_articulo;

            if (!acc[id]) {
                acc[id] = {
                    articulo,
                    cantidad_total: 0,
                    cantidad_total_checada: 0
                };
            }

            acc[id].cantidad_total += Number(det.cant_pedida);
            acc[id].cantidad_total_checada += Number(det.cantidad_checada);

            return acc;
        }, {});

        const articulosPromocion = Object.values(comprasAgrupadas);

        // PAGINACIÓN MANUAL
        const total = articulosPromocion.length;
        const totalPages = Math.ceil(total / filters.limit);

        const articulosPagina = articulosPromocion.slice(offset, offset + filters.limit);

        // 4. Completar datos
        const resultado: any[] = [];

        for (const item of articulosPagina) {
            const art = item.articulo;
            const id_artic = art.id_artic;

            const total = await Stock_Ubicacion_Lote.findOne({
                where: {
                    id_articulo: id_artic,
                    id_empresa_sucursal: filters.id_sucursal,
                },
                attributes: [
                    [fn('COALESCE', fn('SUM', col('cantidad')), 0), 'existencia_total'],
                    [fn('COALESCE', fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 0), 'existencia_disponible'],
                ],
                raw: true,
            });

            const existencia_total = Number((total as any)?.existencia_total ?? 0);
            const existencia_disponible = Number((total as any)?.existencia_disponible ?? 0);
            //console.log("Exitencia_total; ", existencia_total)
            //console.log("Exitencia_disponible; ", existencia_disponible)
            // LOTE
            const [minLote] = await Stock_Ubicacion_Lote.findAll({
                where: {
                    id_articulo: id_artic,
                    id_empresa_sucursal: filters.id_sucursal,
                },
                attributes: [
                    'id_lote',
                    [fn('SUM', col('cantidad')), 'existencia_lote'],
                    [fn('SUM', literal(`cantidad - COALESCE(cantidad_apartada, 0)`)), 'disponible_lote'],
                ],
                include: [{
                    model: LoteArticuloSucursal,
                    as: 'lote', // pon el alias real
                    attributes: ['id_lote_sucursal', 'numero_lote_sucursal', 'fecha_venci_lote_sucursal'],
                    required: true,
                }],
                group: [
                    'Stock_Ubicacion_Lote.id_lote',
                    'lote.id_lote_sucursal',
                    'lote.numero_lote_sucursal',
                    'lote.fecha_venci_lote_sucursal',
                ],
                having: literal(`SUM(cantidad - COALESCE(cantidad_apartada, 0)) > 0`), // opcional: solo lotes con disponible
                order: [[col('lote.fecha_venci_lote_sucursal'), 'ASC']],
                limit: 1,
                raw: true,
            });

            const fechaMin = minLote ? (minLote as any)['lote.fecha_venci_lote_sucursal'] : null;
            const lote_mas_corto = minLote ? (minLote as any)['lote.numero_lote_sucursal'] : null;

            //  console.log("Fecha Min: ", fechaMin)
            //   console.log("Fecha Min: ", (exist as any)['lote.fecha_venci_lote_sucursal'])
            // PRECIO
            const precio = await DetalleListaPreciosRepository.getByArticulo(id_artic, filters.grupoPrecio);

            //     console.log('PEDIDAS ROW:', pedidas);
            // TRANSITO (L, K, R, H)
            const transitoRow = await Detalle_Compra_SolicitadoRepository.getCantidadTransitoPorArticulo(id_artic)
            //const transitoRow = await Detalle_Compra_RecibidosRepository.getCantidadTransitoPorArticulo(id_artic);
            const transito = Number(transitoRow ?? 0);
            resultado.push({
                id_artic,
                descripcion: art.des_artic,
                descripcion_generica: art.des_gener_artic,
                iva: art.tipo_de_iva,
                codigo_interno: art.cod_int_artic,

                existencia_total,
                existencia_disponible,
                fecha_caduca_mas_corta: fechaMin,
                lote_mas_corto,

                precio: precio ? Number(precio.precios) : null,

                cantidad_total: item.cantidad_total,
                cantidad_total_checada: item.cantidad_total_checada,

                transito // T
            });
        }

        return { items: resultado, totalPages };
    },

};
