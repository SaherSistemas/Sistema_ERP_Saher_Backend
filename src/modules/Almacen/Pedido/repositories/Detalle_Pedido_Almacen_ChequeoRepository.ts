import { Op, Transaction } from 'sequelize';
import Detalle_Pedido_Almacen_Chequeo, {
    EstadoAsignacionDetalle
} from '../model/Detalle_Pedido_Almacen_Chequeo';
import { Detalle_Pedido_AlmacenRepository } from './Detalle_Pedido_Almacen.repository';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

interface IAsignarDetallesChequeoInput {
    id_detalle_pedido_almacen: string;
    id_empleado: string;
    estado: EstadoAsignacionDetalle;
    fecha_asignado: Date;
    inicio: null;
    fin: null;
    cant_chequeada: number;
    nota: null;
}
export const Detalle_Pedido_Almacen_ChequeoRepository = {
    detallesPorChecar: async (id_detalle_pedido: string) => {
        const ids_detalles = await Detalle_Pedido_AlmacenRepository.getIdsDetallesPorPedido(id_detalle_pedido)
        // console.log(ids_detalles)

        const ids = ids_detalles.map((d: any) => d.id_detalle_pedido_almacen)
        return await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: {
                id_detalle_pedido_almacen: { [Op.in]: ids },
                estado: { [Op.in]: ['EN_PROCESO', 'ASIGNADO'] }
            }
        })
    },
    asignarDetallesPedidoAChequeo: async (
        id_empleado: string,
        id_pedido_almacen: string,
        t?: Transaction
    ) => {
        if (!id_empleado) {
            throw new Error('id_empleado es requerido');
        }

        if (!id_pedido_almacen) {
            throw new Error('id_pedido_almacen es requerido');
        }

        const detalles = await Detalle_Pedido_AlmacenRepository.getDetallesPorPedidoIDS(
            id_pedido_almacen,
            t
        );

        if (!detalles || detalles.length === 0) {
            throw new Error('El pedido no tiene detalles para chequeo');
        }

        const ahora = new Date();

        const payload = detalles.map((detalle: any) => ({
            id_detalle_pedido_almacen:
                typeof detalle === 'string'
                    ? detalle
                    : detalle.id_detalle_pedido_almacen,
            id_empleado,
            estado: 'ASIGNADO',
            fecha_asignado: ahora,
            inicio: null,
            fin: null,
            cant_chequeada: 0,
            nota: null
        }));

        return await Detalle_Pedido_Almacen_Chequeo.bulkCreate(payload, {
            transaction: t,
            returning: false,
        });
    },

    getDetallesAsignados: async (
        id_empleado: string,
        page: number = 1,
        limit: number = 50
    ) => {
        const offset = (page - 1) * limit;

        const detalles = await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: {
                id_empleado,
                estado: ['ASIGNADO', 'EN_PROCESO']
            },
            attributes: ['id_detalle_chequeo', 'fecha_asignado', 'cant_chequeada'],
            limit,
            offset,
            order: [['fecha_asignado', 'ASC']],
            include: [
                {
                    model: Detalle_Pedido_Almacen,
                    as: 'detalle_pedido',
                    attributes: ['id_detalle_pedido_almacen', 'cant_pedida'],
                    required: true,
                    include: [
                        {
                            model: Articulo,
                            as: 'articulo',
                            attributes: ['cod_barr_artic', 'des_artic'],
                            required: false
                        },
                        {
                            model: Detalle_Pedido_Almacen_Lote,
                            as: 'lotes',
                            attributes: ['id_lote_sucursal', 'cantidad'],
                            required: false,
                            separate: true,
                            include: [
                                {
                                    model: Lote_Articulo_Sucursal,
                                    as: 'lote_articulo_sucursal',
                                    attributes: ['numero_lote_sucursal', 'fecha_venci_lote_sucursal'],
                                    required: false
                                }
                            ]
                        }
                    ]
                }
            ],
            subQuery: false
        });

        return detalles;

    },

    algunPedidoAsignadoChequeo: async (id_empleado: string) => {
        const asignacion = await Detalle_Pedido_Almacen_Chequeo.findOne({
            attributes: [], // no necesitas nada de esta tabla
            where: {
                id_empleado,
                estado: {
                    [Op.in]: ['ASIGNADO', 'EN_PROCESO']
                }
            },
            include: [{
                model: Detalle_Pedido_Almacen,
                attributes: ['id_pedido_almacen'],
                required: true
            }],
            raw: true,
        });
        return asignacion?.['detalle_pedido.id_pedido_almacen'] ?? null;
    },

    checarArticulo: async (idPedido: string, cod_barras: string, cantidad: number, id_empleado: string) => {
        const articulo = await Detalle_Pedido_Almacen_Chequeo.findOne({
            where: {
                id_empleado: id_empleado
            },
            include: [
                {
                    model: Detalle_Pedido_Almacen,
                    as: 'detalle_pedido',
                    required: true,
                    where: {
                        id_pedido_almacen: idPedido,
                    },
                    include: [
                        {
                            model: Articulo,
                            required: true,
                            attributes: ['id_artic', 'cod_barr_artic'],
                            where: {
                                cod_barr_artic: cod_barras
                            }
                        }
                    ]
                }
            ],
            raw: true
        });

        if (!articulo) throw new Error(`Artículo no encontrado`);

        // Validar que no exceda la cantidad pedida
        const cantPedida = articulo['detalle_pedido.cant_pedida'];
        const cantActual = articulo.cant_chequeada;
        const nuevaCantidad = cantActual + cantidad;

        if (nuevaCantidad > cantPedida) {
            throw new Error(
                `Cantidad excede lo pedido. Pedido: ${cantPedida}, Ya chequeado: ${cantActual}, Intentando agregar: ${cantidad}`
            );
        }

        // Update
        await Detalle_Pedido_Almacen_Chequeo.update(
            {
                cant_chequeada: nuevaCantidad,
                estado: nuevaCantidad === cantPedida ? 'TERMINADO' : 'EN_PROCESO',
                inicio: cantActual === 0 ? new Date() : articulo.inicio, // primera vez que chequea
                fin: nuevaCantidad === cantPedida ? new Date() : null,
            },
            {
                where: {
                    id_detalle_chequeo: articulo.id_detalle_chequeo
                }
            }
        );

        return {
            id_detalle_chequeo: articulo.id_detalle_chequeo,
            cant_chequeada: nuevaCantidad,
            cant_pedida: cantPedida,
            estado: nuevaCantidad === cantPedida ? 'COMPLETO' : 'EN_PROCESO',
            articulo: articulo['detalle_pedido.articulo.cod_barr_artic']
        };
    }
};
