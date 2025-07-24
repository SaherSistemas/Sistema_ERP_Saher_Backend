import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import { IDataLotesRecibidos } from '../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface';
import Lotes_Solicitado_Compra from '../../models/LotesYCaducidad/LotesSolicitadoCompra';
import { Compra_ProveedorRepository } from '../Compras/Compra_Proveedor.repository';
import Detalle_Compra_Recibido from '../../models/Compra/Detalle_Compra_Recibido';

export const LotesSolicitadoCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    },
    create: async (data: IDataLotesRecibidos) => {
        const { id_comp, productos, id_empleado_registro_lotes } = data;

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
                observacion_lote: lote.observacion_lote || null,
                estado_lote: 'O',
                motivo_ajuste: 'LOTE Y CADUCIDAD CORRECTA',
            }))
        );

        const detalleCompraRecibido = productos.map((producto) => ({
            id_detcomprec: uuidv4(),
            idcompr_detcomprec: id_comp,
            idarticulo_detcomprec: producto.id_detallecompr_solicitado,
            cantidad_detcomprec: producto.lotes.reduce((sum, l) => sum + l.cantidad_lote, 0),
            precio_detcomprec: producto.precio,
        }));

        await Compra_ProveedorRepository.actualizarEstadoAlGuardarLotes(id_comp, id_empleado_registro_lotes)



        await LotesRecibidosCompra.bulkCreate(lotesRecibidos);

        return await Lotes_Solicitado_Compra.bulkCreate(lotesSolicitados);
    }

}