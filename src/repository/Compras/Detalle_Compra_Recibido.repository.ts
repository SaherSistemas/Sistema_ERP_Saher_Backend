import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Recibidos from '../../models/Compra/Detalle_Compra_Recibido';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import Articulo from '../../models/Articulos/Articulo';

export const Detalle_Compra_RecibidosRepository = {

    createDetallesCompraRecibido: async (detallesRecibidos: any[]) => {
        console.log('Detalles recibidos a crear:', detallesRecibidos);
        return await Detalle_Compra_Recibidos.bulkCreate(detallesRecibidos)
    },

    getAllDetallesDeCompraRecibidosDeUnaCompra: async (id_comp: string) => {
        return await Detalle_Compra_Recibidos.findAll({
            where: { idcompr_detcomprec: id_comp },
            include: [
                { model: LotesRecibidosCompra },
                { model: Articulo }
            ]
        });
    }
}