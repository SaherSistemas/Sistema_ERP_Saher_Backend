import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';
import { IDataLotesRecibidos } from '../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface';
import Lotes_Solicitado_Compra from '../../models/LotesYCaducidad/LotesSolicitadoCompra';
import { Compra_ProveedorRepository } from '../Compras/Compra_Proveedor.repository';
import Detalle_Compra_Recibido from '../../models/Compra/Detalle_Compra_Recibido';
import { LoteRecibidoCompraRepository } from './LoteRecibidoCompra.repository';

export const LotesSolicitadoCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    },
    create: async (data: IDataLotesRecibidos) => {
        const { id_comp, productos, id_empleado_registro_lotes } = data;

        // Obtener los id_detcomprec relacionados
        const detalleRecibidoMap = new Map<string, string>();

        for (const producto of productos) {
            const detalleRecibido = await Detalle_Compra_Recibido.findOne({
                where: { id_detallecompr_solicitado: producto.id_detallecompr_solicitado },
            });
            //console.log(`Detalle recibido encontrado para producto ${producto.id_detallecompr_solicitado}:`, detalleRecibido);
            //console.log(detalleRecibido)

            if (detalleRecibido) {
                detalleRecibidoMap.set(producto.id_detallecompr_solicitado, detalleRecibido.id_detcomprec);
            } else {
                throw new Error(`No se encontró el detalle recibido para el producto con ID ${producto.id_detallecompr_solicitado}`);
            }
        }

        // Generar lotes solicitados
        const lotesSolicitados = productos.flatMap((producto) =>
            producto.lotes.map((lote) => ({
                id_lotesolicitado: uuidv4(),
                id_detallecompr_solicitado: producto.id_detallecompr_solicitado,
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_lote: lote.cantidad_lote,
            }))
        );

        // Generar lotes recibidos con el id_detcomprec correcto
        const lotesRecibidos = productos.flatMap((producto) => {
            const id_detcomprec = detalleRecibidoMap.get(producto.id_detallecompr_solicitado);
            return producto.lotes.map((lote) => ({
                id_loterecibido: uuidv4(),
                id_detallecompr_recibido: id_detcomprec,
                numerolote_lote: lote.numerolote_lote,
                fechavencimiento_lote: lote.fechavencimiento_lote,
                cantidad_lote: lote.cantidad_lote,
                observacion_lote: lote.observacion_lote || null,
                estado_lote: 'O',
                motivo_ajuste: 'LOTE Y CADUCIDAD CORRECTA',
            }));
        });

        await Compra_ProveedorRepository.actualizarEstadoAlGuardarLotes(id_comp, id_empleado_registro_lotes);
        await LoteRecibidoCompraRepository.create(lotesRecibidos)
        //await LotesRecibidosCompra.bulkCreate(lotesRecibidos);
        return await Lotes_Solicitado_Compra.bulkCreate(lotesSolicitados);
    }

}