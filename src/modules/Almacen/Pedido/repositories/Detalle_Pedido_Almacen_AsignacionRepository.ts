import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Detalle_Pedido_Almacen from '../model/Detalle_Pedido_Almacen';
import Detalle_Pedido_Almacen_Asignacion from '../model/Detalle_Pedido_Almacen_Asignacion';
import { Detalle_Pedido_AlmacenRepository } from './Detalle_Pedido_Almacen.repository';

import { Op, Transaction } from "sequelize";

export const Detalle_Pedido_Almacen_AsignacionRepository = {

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

    getDetalleAsignado: async (id_usuario: string) => {
        const row = await Detalle_Pedido_Almacen_Asignacion.findOne({
            where: {
                id_usuario,
                estado: {
                    [Op.in]: ['ASIGNADO', 'EN_PROCESO']
                }
            },
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
                    include: [
                        {
                            model: Articulo,
                            as: 'articulo',
                            required: false,
                            attributes: [
                                ['id_artic', 'id_articulo'],
                                'des_artic',
                                'cod_barr_artic',
                            ]
                        }
                    ]
                }
            ]
        });

        if (!row) return null;

        const json = row.toJSON();

        return {
            id_detalle_asignacion: json.id_detalle_asignacion,
            id_detalle_pedido: json.id_detalle_pedido_almacen,
            estado: json.estado,
            detalle: json.detalle
        };
    },
    asignarDetallesPedidoASurtidor: async (id_usuario: string, id_pedido_almacen: string, t?: Transaction) => {
        const detalles = await Detalle_Pedido_AlmacenRepository.getDetallesPorPedidoIDS(id_pedido_almacen);

        for (const id_detalle of detalles) {
            await Detalle_Pedido_Almacen_Asignacion.create({
                id_detalle_pedido_almacen: id_detalle,
                id_usuario,
                estado: 'ASIGNADO'
            }, { transaction: t });
        }
    }

};
