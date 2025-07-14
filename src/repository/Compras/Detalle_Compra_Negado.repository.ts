import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Negados from '../../models/Compra/Detalle_Compra_Negados';

export const Detalle_Compra_NegadosRepository = {

    agregarProductosNegados: async (detallesNegados: any[]) => {
        return await Detalle_Compra_Negados.bulkCreate(detallesNegados, {
            updateOnDuplicate: ['cantidad_negada', 'motivo_negado', 'recuperado', 'fecha_negado', 'fecha_limite_recuperacion']
        });
    },

}