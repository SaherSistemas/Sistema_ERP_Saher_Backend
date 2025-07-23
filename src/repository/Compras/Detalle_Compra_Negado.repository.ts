import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Negados from '../../models/Compra/Detalle_Compra_Negados';

export const Detalle_Compra_NegadosRepository = {


    getByID: async (id_detcompneg: string) => {
        return await Detalle_Compra_Negados.findByPk(id_detcompneg)
    },
    agregarProductosNegados: async (detallesNegados: any[]) => {
        return await Detalle_Compra_Negados.bulkCreate(detallesNegados, {
            updateOnDuplicate: ['cantidad_negada', 'motivo_negado', 'recuperado', 'fecha_negado', 'fecha_limite_recuperacion']
        });
    },

    recuperadoTrue: async (id_detcompneg: string) => {
        const detalleCompraNegado = await Detalle_Compra_NegadosRepository.getByID(id_detcompneg)

        return detalleCompraNegado.update({
            recuperado: true
        })
    }
}