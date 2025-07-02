import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import { IDataLotesRecibidos } from '../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface';
import Lotes_Solicitado_Compra from '../../models/LotesYCaducidad/LotesSolicitadoCompra';
import { CompraRepository } from '../Compras/Compra.repository';

export const LotesSolicitadoCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    },
    create: async (data: IDataLotesRecibidos) => {
        const { id_comp, productos } = data;
        console.log(data)

        const lotesAGuardar = productos.flatMap((producto) => {
            return producto.lotes.map((lote) => ({
                id_lotesolicitado: uuidv4(),
                id_detallecompr_solicitado: producto.id_detallecompr_solicitado,
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_solicitada: lote.cantidad_solicitada,
            }));
        });

        await CompraRepository.actualizarEstadoAlGuardarLotes(data.id_comp)

        return await Lotes_Solicitado_Compra.bulkCreate(lotesAGuardar);
    }

}