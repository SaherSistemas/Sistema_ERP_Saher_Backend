import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Recibidos from '../../models/Compra/Detalle_Compra_Recibido';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import Articulo from '../../models/Articulos/Articulo';
import { ICreateOrUpdateStockSucursal } from '../../interface/Stock/Stock_Sucursal.interface';
import { LoteRecibidoCompraRepository } from '../LotesYCaducidad/LoteRecibidoCompra.repository';

export const Detalle_Compra_RecibidosRepository = {

    createDetallesCompraRecibido: async (detallesRecibidos: any[]) => {
        // console.log('Detalles recibidos a crear:', detallesRecibidos);
        return await Detalle_Compra_Recibidos.bulkCreate(detallesRecibidos)
    },
    getByPK: async (id_detalle_recibido: string) => {
        return await Detalle_Compra_Recibidos.findByPk(id_detalle_recibido)
    },
    getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
        return await Detalle_Compra_Recibidos.findAll({
            where: { idcompr_detcomprec: id_comp },
            include: [
                { model: LotesRecibidosCompra },
                { model: Articulo }
            ]
        });
    },
    getArticulosRecibidos: async (idcompr_detcomprec: string) => {
        return await Detalle_Compra_Recibidos.findAll({
            where: { idcompr_detcomprec }
        })
    },
    getArtuculoRecibido: async (id_detcomprec: string) => {
        return await Detalle_Compra_Recibidos.findByPk(id_detcomprec, {
            attributes: ['idarticulo_detcomprec']
        })
    },

    actualizarCantidadRecibidaReal: async (id_detalleRecibido: string, cantidadRealEntrada: number) => {

        const detalleRecibido = await Detalle_Compra_RecibidosRepository.getByPK(id_detalleRecibido);

        return await detalleRecibido.update({
            cantidad_detcomprec: cantidadRealEntrada
        })
    }
}