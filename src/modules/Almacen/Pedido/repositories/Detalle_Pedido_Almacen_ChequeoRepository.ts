import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Detalle_Pedido_Almacen_Chequeo, {
    EstadoAsignacionDetalle
} from '../model/Detalle_Pedido_Almacen_Chequeo';
import { Detalle_Pedido_AlmacenRepository } from './Detalle_Pedido_Almacen.repository';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

export const Detalle_Pedido_Almacen_ChequeoRepository = {

    // ── Filas pendientes de chequeo (para saber si el pedido terminó) ─────────
    detallesPorChecar: async (id_pedido_alm: string) => {
        const ids_detalles = await Detalle_Pedido_AlmacenRepository.getIdsDetallesPorPedido(id_pedido_alm);
        const ids = ids_detalles.map((d: any) => d.id_detalle_pedido_almacen);

        return await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: {
                id_detalle_pedido_almacen: { [Op.in]: ids },
                estado: { [Op.in]: ['ASIGNADO', 'EN_PROCESO'] },
            },
        });
    },

    // ── Asignar pedido a chequeo: 1 fila por lote surtido ────────────────────
    asignarDetallesPedidoAChequeo: async (
        id_empleado: string,
        id_pedido_almacen: string,
        t?: Transaction
    ) => {
        if (!id_empleado) throw new Error('id_empleado es requerido');
        if (!id_pedido_almacen) throw new Error('id_pedido_almacen es requerido');

        const detalles = await Detalle_Pedido_Almacen.findAll({
            where: { id_pedido_almacen },
            include: [{
                model: Detalle_Pedido_Almacen_Lote,
                as: 'lotes',
                required: false,
            }],
            transaction: t,
        });

        if (!detalles || detalles.length === 0) {
            throw new Error('El pedido no tiene detalles para chequeo');
        }

        const ahora = new Date();
        const payload: any[] = [];

        for (const detalle of detalles) {
            const lotes = (detalle as any).lotes as Detalle_Pedido_Almacen_Lote[];

            if (lotes && lotes.length > 0) {
                // Una fila de chequeo por cada lote surtido
                for (const lote of lotes) {
                    payload.push({
                        id_detalle_chequeo: uuidv4(),
                        id_detalle_pedido_almacen: detalle.id_detalle_pedido_almacen,
                        id_detalle_pedido_almacen_lote: lote.id_detalle_pedido_almacen_lote,
                        cant_surtida_lote: lote.cantidad,
                        id_empleado,
                        estado: 'ASIGNADO',
                        fecha_asignado: ahora,
                        inicio: null,
                        fin: null,
                        cant_chequeada: 0,
                        nota: null,
                    });
                }
            } else {
                // Sin lotes → una fila con cant_pedida como target
                payload.push({
                    id_detalle_chequeo: uuidv4(),
                    id_detalle_pedido_almacen: detalle.id_detalle_pedido_almacen,
                    id_detalle_pedido_almacen_lote: null,
                    cant_surtida_lote: detalle.cant_pedida,
                    id_empleado,
                    estado: 'ASIGNADO',
                    fecha_asignado: ahora,
                    inicio: null,
                    fin: null,
                    cant_chequeada: 0,
                    nota: null,
                });
            }
        }

        return await Detalle_Pedido_Almacen_Chequeo.bulkCreate(payload, {
            transaction: t,
            returning: false,
        });
    },

    // ── Detalles asignados al empleado (uno por lote) ─────────────────────────
    // Devuelve info del lote ESPECÍFICO de cada fila (no todos los lotes del detalle)
    getDetallesAsignados: async (id_empleado: string) => {
        return await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: {
                id_empleado,
                estado: { [Op.in]: ['ASIGNADO', 'EN_PROCESO'] },
            },
            attributes: [
                'id_detalle_chequeo',
                'id_detalle_pedido_almacen_lote',
                'cant_surtida_lote',
                'cant_chequeada',
                'estado',
                'fecha_asignado',
            ],
            order: [['fecha_asignado', 'ASC']],
            include: [
                {
                    model: Detalle_Pedido_Almacen,
                    as: 'detalle_pedido',
                    attributes: ['id_detalle_pedido_almacen', 'cant_pedida', 'id_pedido_almacen'],
                    required: true,
                    include: [
                        {
                            model: Articulo,
                            as: 'articulo',
                            attributes: ['cod_barr_artic', 'des_artic'],
                            required: false,
                        },
                    ],
                },
                // El lote ESPECÍFICO de esta fila de chequeo
                {
                    model: Detalle_Pedido_Almacen_Lote,
                    as: 'detalle_lote',
                    attributes: [
                        'id_detalle_pedido_almacen_lote',
                        'id_lote_sucursal',
                        'cantidad',
                        'lote_factura_numero',
                        'lote_factura_fecha',
                    ],
                    required: false,
                    include: [
                        {
                            model: Lote_Articulo_Sucursal,
                            as: 'lote_articulo_sucursal',
                            attributes: ['numero_lote_sucursal', 'fecha_venci_lote_sucursal'],
                            required: false,
                        },
                    ],
                },
            ],
        });
    },

    algunPedidoAsignadoChequeo: async (id_empleado: string) => {
        const asignacion = await Detalle_Pedido_Almacen_Chequeo.findOne({
            attributes: [],
            where: {
                id_empleado,
                estado: { [Op.in]: ['ASIGNADO', 'EN_PROCESO'] },
            },
            include: [{
                model: Detalle_Pedido_Almacen,
                attributes: ['id_pedido_almacen'],
                required: true,
            }],
            raw: true,
        });
        return asignacion?.['detalle_pedido.id_pedido_almacen'] ?? null;
    },

    // ── Checar artículo: distribuye cantidad entre lotes en orden ─────────────
    // Devuelve el estado actualizado de cada fila de lote para ese artículo
    checarArticulo: async (
        idPedido: string,
        cod_barras: string,
        cantidad: number,
        id_empleado: string
    ) => {
        //console.log(`Chequeando artículo ${cod_barras} (cantidad: ${cantidad}) para pedido ${idPedido} y empleado ${id_empleado}`);
        // Obtener todas las filas de chequeo del artículo (una por lote)
        const filas = await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: { id_empleado },
            include: [{
                model: Detalle_Pedido_Almacen,
                as: 'detalle_pedido',
                required: true,
                where: { id_pedido_almacen: idPedido },
                include: [{
                    model: Articulo,
                    required: true,
                    attributes: ['id_artic', 'cod_barr_artic'],
                    where: {
                        cod_barr_artic: {
                            [Op.iLike]: `%${cod_barras.trim()}%`
                        }
                    },
                }],
            }],
            order: [['fecha_asignado', 'ASC']],
        });
        //    console.log("Filas encontradas para chequeo:", filas.length);
        //  console.log("Detalle pedido incluido en filas:", filas.map(f => f.detalle_pedido?.id_detalle_pedido_almacen));
        if (!filas.length) throw new Error('Artículo no encontrado en el chequeo');

        const cantSurtidaTotal = filas.reduce((s, f) => s + (Number(f.cant_surtida_lote) || 0), 0);
        const cantChecadaActual = filas.reduce((s, f) => s + (Number(f.cant_chequeada) || 0), 0);
        const cantPedida = (filas[0] as any).detalle_pedido?.cant_pedida ?? cantSurtidaTotal;

        if (cantChecadaActual + cantidad > cantSurtidaTotal) {
            throw new Error(
                `Cantidad excede lo surtido. Surtido: ${cantSurtidaTotal}, Ya chequeado: ${cantChecadaActual}, Intentando agregar: ${cantidad}`
            );
        }

        // Distribuir entre lotes en orden (llena el primero incompleto primero)
        let porDistribuir = cantidad;
        const ahora = new Date();

        for (const fila of filas) {
            if (porDistribuir <= 0) break;

            const capacidad = Number(fila.cant_surtida_lote) || 0;
            const yaChecado = Number(fila.cant_chequeada) || 0;
            const disponible = capacidad - yaChecado;

            if (disponible <= 0) continue;

            const agregar = Math.min(porDistribuir, disponible);
            const nuevaCant = yaChecado + agregar;
            const estaCompleto = nuevaCant >= capacidad;

            await fila.update({
                cant_chequeada: nuevaCant,
                estado: estaCompleto ? 'TERMINADO' : 'EN_PROCESO',
                inicio: yaChecado === 0 ? ahora : fila.inicio,
                fin: estaCompleto ? ahora : null,
            });

            porDistribuir -= agregar;
        }

        const nuevaCantTotal = cantChecadaActual + cantidad;
        const todoCompleto = nuevaCantTotal >= cantSurtidaTotal;

        // Devolver el estado actualizado de cada fila de lote
        const filasActualizadas = filas.map(f => ({
            id_detalle_chequeo: f.id_detalle_chequeo,
            cant_chequeada: Number(f.cant_chequeada),
            cant_surtida_lote: Number(f.cant_surtida_lote),
            estado: f.estado,
        }));

        return {
            articulo: cod_barras,
            cant_chequeada: nuevaCantTotal,
            cant_pedida: cantPedida,
            cant_surtida: cantSurtidaTotal,
            pedidoTerminado: false, // lo decide el service
            filas: filasActualizadas,
        };
    },
};
