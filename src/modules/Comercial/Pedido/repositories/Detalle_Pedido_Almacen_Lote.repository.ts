import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { IDetallePedidoAlmacenLote } from '../interface/Detalle_Pedido_Almacen_Lote.interface';
import Detalle_Pedido_Almacen_Lote from '../model/Detalle_Pedido_Almacen_Lote';
import { Detalle_Pedido_AlmacenRepository } from './Detalle_Pedido_Almacen.repository';
import { LotesArticuloSucursalRepository } from '../../../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository';
import { Pedido_AlmacenRepository } from './Pedido_Almacen.repository';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';


export const Detalle_Pedido_Almacen_LoteRepository = {
    create: async (id_pedido: string, transaction?: Transaction) => {
        const obtenerEmpresaPrincipal = await Empresa_SucursalRepository.getEmpresaPrincipal();

        // Obtener los detalles del pedido
        const obtenerDetalles = await Detalle_Pedido_AlmacenRepository.findByIDPedido(id_pedido);

        const detallesConLote: any[] = [];

        for (const det of obtenerDetalles) {
            // Cantidad que necesitamos asignar del detalle
            let cantidadPendiente = det.cant_pedida;

            // Obtener lotes disponibles
            let lotesDisponibles = await LotesArticuloSucursalRepository.getLotesPorCodigoBarra(
                det.id_articulo,
                obtenerEmpresaPrincipal.id_empre
            );

            // Ordenar por fecha de caducidad ascendente (el que vence primero primero)
            lotesDisponibles.sort(
                (a, b) => new Date(a.dataValues.fecha_venci_lote_sucursal).getTime() -
                    new Date(b.dataValues.fecha_venci_lote_sucursal).getTime()
            );

            for (const lote of lotesDisponibles) {
                if (cantidadPendiente <= 0) break; // ya asignamos todo

                const cantidadAsignar = Math.min(cantidadPendiente, lote.dataValues.cantidad_lote_sucursal);

                // Crear registro de detalle por lote
                const detalleLoteCreado = await Detalle_Pedido_Almacen_Lote.create({
                    id_detalle_pedido_almacen_lote: uuidv4(),
                    id_detalle_pedido_almacen: det.id_detalle_pedido_almacen,
                    id_lote_sucursal: lote.dataValues.id_lote_sucursal,
                    cantidad: cantidadAsignar
                }, { transaction });

                detallesConLote.push(detalleLoteCreado);

                //APARTAR CANTIDAD
                await LotesArticuloSucursalRepository.apartarCantidad(lote.id_lote_sucursal, cantidadAsignar)

                // Reducir la cantidad pendiente
                cantidadPendiente -= cantidadAsignar;
            }

            if (cantidadPendiente > 0) {
                throw new Error(`No hay suficiente stock para el artículo ${det.id_articulo}`);
            }
        }

        return detallesConLote;
    },



};
