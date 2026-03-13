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
        limit: number = 1
    ) => {
        const offset = (page - 1) * limit;

        const detalles = await Detalle_Pedido_Almacen_Chequeo.findAll({
            where: { id_empleado },
            attributes: ['id_detalle_chequeo', 'fecha_asignado'],
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
};
