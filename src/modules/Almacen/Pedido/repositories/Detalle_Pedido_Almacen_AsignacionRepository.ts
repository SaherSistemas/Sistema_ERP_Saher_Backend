import { dbLocal } from '../../../../config/db';
import Articulo_Ubicacion_Default from '../../../Catalogos/Articulos/feature/Articulo_Ubicacion_Default/model/Articulo_Ubicacion_Default';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Ubicacion_Sucursal from '../../Ubicaciones/model/Ubicacion_Sucursal';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Detalle_Pedido_Almacen_Asignacion from '../model/Detalle_Pedido_Almacen_Asignacion';
import { Detalle_Pedido_AlmacenRepository } from './Detalle_Pedido_Almacen.repository';

import { literal, Op, Transaction } from "sequelize";

export const Detalle_Pedido_Almacen_AsignacionRepository = {
    countPendientesByPedido: async (id_pedido_alm: string) => {
        const count = await Detalle_Pedido_Almacen_Asignacion.count({
            where: {
                estado: {
                    [Op.in]: ['ASIGNADO', 'EN_PROCESO']
                }
            },
            include: [{
                model: Detalle_Pedido_Almacen,
                as: 'detalle',
                required: true,
                where: { id_pedido_almacen: id_pedido_alm }
            }]
        });
        return count;
    },
    marcarSurtido: async (id_detalle_asignacion: string, t?: Transaction) => {
        const [count, rows] = await Detalle_Pedido_Almacen_Asignacion.update(
            { estado: 'TERMINADO', fin: new Date() },
            {
                where: {
                    id_detalle_asignacion,
                    estado: {
                        [Op.in]: ['ASIGNADO', 'EN_PROCESO']
                    }
                },
                transaction: t,
                returning: true
            }
        );

        return rows[0] || null;
    },
    algunPedidoAsignado: async (id_usuario: string) => {
        const asignacion = await Detalle_Pedido_Almacen_Asignacion.findOne({
            attributes: [], // no necesitas nada de esta tabla
            where: {
                id_usuario,
                estado: ['ASIGNADO', 'EN_PROCESO']
            },
            include: [{
                model: Detalle_Pedido_Almacen,
                attributes: ['id_pedido_almacen'],
                required: true
            }]
        });
        return asignacion?.detalle?.id_pedido_almacen ?? null;
    },

    getDetalleAsignado: async (id_usuario: string, id_pedido_alm: string) => {
        return await dbLocal.transaction(async (t: Transaction) => {
            let rowBase = await Detalle_Pedido_Almacen_Asignacion.findOne({
                where: {
                    id_usuario,
                    estado: 'EN_PROCESO'
                },
                attributes: [
                    'id_detalle_asignacion',
                    'id_detalle_pedido_almacen',
                    'estado'
                ],
                order: [['orden', 'ASC']],
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!rowBase) {
                rowBase = await Detalle_Pedido_Almacen_Asignacion.findOne({
                    where: {
                        id_usuario,
                        estado: 'ASIGNADO'
                    },
                    attributes: [
                        'id_detalle_asignacion',
                        'id_detalle_pedido_almacen',
                        'estado'
                    ],
                    order: [['orden', 'ASC']],
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!rowBase) return null;

                await rowBase.update(
                    { estado: 'EN_PROCESO', inicio: new Date() },
                    { transaction: t }
                );
            }

            const row = await Detalle_Pedido_Almacen_Asignacion.findByPk(
                rowBase.id_detalle_asignacion,
                {
                    attributes: [
                        'id_detalle_asignacion',
                        'id_detalle_pedido_almacen',
                        'estado'
                    ],
                    include: [
                        {
                            model: Detalle_Pedido_Almacen,
                            as: 'detalle',
                            required: true,
                            attributes: [
                                'id_detalle_pedido_almacen',
                                'id_pedido_almacen',
                                'id_articulo',
                                'cant_pedida'
                            ],
                            where: {
                                id_pedido_almacen: id_pedido_alm
                            },
                            include: [
                                {
                                    model: Articulo,
                                    as: 'articulo',
                                    required: false,
                                    attributes: [
                                        ['id_artic', 'id_articulo'],
                                        'des_artic',
                                        'cod_barr_artic',
                                    ],
                                    include: [
                                        {
                                            model: Articulo_Ubicacion_Default,
                                            as: 'ubicaciones_default',
                                            required: false,
                                            attributes: [
                                                'id_articulo_ubicacion_default',
                                                'id_empresa_sucursal',
                                                'id_articulo',
                                                'id_ubicacion_default'
                                            ],
                                            include: [
                                                {
                                                    model: Ubicacion_Sucursal,
                                                    as: 'ubicacion_sucursal',
                                                    required: false,
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    transaction: t
                }
            );

            if (!row) return null;

            const json = row.toJSON();

            return {
                id_detalle_asignacion: json.id_detalle_asignacion,
                id_detalle_pedido: json.id_detalle_pedido_almacen,
                estado: json.estado,
                detalle: json.detalle
            };
        });
    },


    asignarDetallesPedidoASurtidor: async (
        id_usuario: string,
        detallesOrdenados: Array<{ id_detalle_pedido_almacen: string; orden: number }>,
        t?: Transaction
    ) => {
        const payload = detallesOrdenados.map((d) => ({
            id_detalle_pedido_almacen: d.id_detalle_pedido_almacen,
            id_usuario,
            estado: 'ASIGNADO',
            orden: d.orden,
        }));

        return await Detalle_Pedido_Almacen_Asignacion.bulkCreate(payload, {
            transaction: t
        });
    }

};
