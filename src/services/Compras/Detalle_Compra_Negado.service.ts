import { Detalle_Compra_NegadosRepository } from "../../repository/Compras/Detalle_Compra_Negado.repository";
import { v4 as uuidv4 } from 'uuid';

export const Detalle_Compra_NegadosService = {

    createDetalleCompraNegados: async (id_comp: string, productosNegados: any[]) => {
        const detallesNegados = productosNegados.map(productoNeg => ({
            id_detcompneg: uuidv4(),
            idcompr_detcompneg: id_comp,
            idarticulo_detcompneg: productoNeg.idarticulo_detcompneg,
            cantidad_negada: productoNeg.cantidad_negada,
            motivo_negado: productoNeg.motivo_negado,
            recuperado: false,
            fecha_negado: new Date(),
            fecha_limite_recuperacion: new Date(new Date().setDate(new Date().getDate() + 10))
        }));
        return await Detalle_Compra_NegadosRepository.agregarProductosNegados(detallesNegados);
    }



}