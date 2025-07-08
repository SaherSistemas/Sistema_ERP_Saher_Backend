import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import { IDataLotesRecibidos } from '../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface';
import Lotes_Solicitado_Compra from '../../models/LotesYCaducidad/LotesSolicitadoCompra';
import { Compra_ProveedorRepository } from '../Compras/Compra_Proveedor.repository';

export const LotesSolicitadoCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    },
    create: async (data: IDataLotesRecibidos) => {
        const { id_comp, productos } = data;

        const lotesSolicitados = productos.flatMap((producto) => {
            return producto.lotes.map((lote) => ({
                id_lotesolicitado: uuidv4(),
                id_detallecompr_solicitado: producto.id_detallecompr_solicitado,
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_lote: lote.cantidad_lote,
            }));
        });

        const lotesRecibidos = productos.flatMap((producto) =>
            producto.lotes.map((lote) => ({
                id_loterecibido: uuidv4(),
                id_detallecompr_recibido: producto.id_detallecompr_solicitado, // este es para tabla 2
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_lote: lote.cantidad_lote,
                estado_lote: 'O',
                motivo_ajuste: 'LOTE Y CADUCIDAD CORRECTA',
            }))
        );
        await Compra_ProveedorRepository.actualizarEstadoAlGuardarLotes(data.id_comp)


        await LotesRecibidosCompra.bulkCreate(lotesRecibidos);

        return await Lotes_Solicitado_Compra.bulkCreate(lotesSolicitados);
    }

}