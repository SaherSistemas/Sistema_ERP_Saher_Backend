
import { Transaction } from 'sequelize';
import Detalle_Compra_Negados from '../model/Detalle_Compra_Negados';

export const Detalle_Compra_NegadosRepository = {


    getByID: async (id_detcompneg: string) => {
        return await Detalle_Compra_Negados.findByPk(id_detcompneg)
    },
    agregarProductosNegados: async (detallesNegados: any[], options?: { transaction?: Transaction }) => {
        return await Detalle_Compra_Negados.bulkCreate(detallesNegados, {
            updateOnDuplicate: [
                'cantidad_negada',
                'motivo_negado',
                'recuperado',
                'fecha_negado',
                'fecha_limite_recuperacion'
            ],
            transaction: options?.transaction // 👈 usar transacción
        });
    },

    recuperadoTrue: async (id_detcompneg: string) => {
        const detalleCompraNegado = await Detalle_Compra_NegadosRepository.getByID(id_detcompneg)

        return detalleCompraNegado.update({
            recuperado: true
        })
    }
}