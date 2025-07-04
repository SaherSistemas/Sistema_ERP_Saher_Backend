import { IDataLotesRecibidos } from "../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";
import { LotesSolicitadoCompraRepository } from "../../repository/LotesYCaducidad/LotesSolicitadosCompra.repository";
export const LotesSolicitadoCompraService = {

    guardarLoteCompraSolicitada: async (data: any) => {
        const productosMapeados = data.productos.map((producto: any) => {
            if (!producto.lotes || producto.lotes.length === 0) {
                throw new Error(`Producto inválido o sin lotes: ${JSON.stringify(producto)}`);
            }

            const lotesMapeados = producto.lotes.map((lote: any) => {
                if (!lote.numerolote_lote || !lote.fechavencimiento_lote || typeof lote.cantidad_lote !== 'number') {
                    throw new Error(`Datos de lote incompletos: ${JSON.stringify(lote)}`);
                }

                return {
                    numerolote_lote: lote.numerolote_lote,
                    fechavencimiento_lote: lote.fechavencimiento_lote,
                    cantidad_lote: lote.cantidad_lote,
                };
            });

            return {
                id_detallecompr_solicitado: producto.id_detcompsol,
                lotes: lotesMapeados
            };
        });

        const resultado = await LotesSolicitadoCompraRepository.create({
            id_comp: data.id_comp,
            productos: productosMapeados
        });


        return resultado;
    },

}