import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Recibidos from '../../models/Compra/Detalle_Compra_Recibido';

export const Detalle_Compra_RecibidosRepository = {

    createDetallesCompraRecibido: async (detallesRecibidos: any[]) => {
        return await Detalle_Compra_Recibidos.bulkCreate(detallesRecibidos)
    }
}