import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Detalle_Compra_RecibidosRepository } from "../../../Compras/repositories/Detalle_Compra_Recibido.repository";
import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor, IGuardarCapturaCompletaDTO } from "../interface/Factura_Compra_Proveedor.interfece";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { Detalle_Compra_RecibidoService } from "../../../Compras/services/Detalle_Compra_Recibido.service";
import { LotesSolicitadoCompraRepository } from "../../../../repository/LotesYCaducidad/LotesSolicitadosCompra.repository";
import { IDataLotesRecibidos, IDetalleSolicitado, ILoteRecibido } from "../../../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";

export const Factura_Compra_ProveedorService = {
    getAllFacturas: async (): Promise<IFactura_Compra_Proveedor[]> => {
        return await Factura_Compra_ProveedorRepository.getAll();
    },
    getByIDComp: async (id_comp: string): Promise<IFactura_Compra_Proveedor | null> => {
        return await Factura_Compra_ProveedorRepository.getByID(id_comp);
    },

    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        return await Factura_Compra_ProveedorRepository.guardarFacturaEIniciarCapturaLotes(data)
    },


    guardarCapturaCompleta: async (data: IGuardarCapturaCompletaDTO) => {
        const {
            id_comp,
            id_factura_proveedor,
            id_empleado_registro_lotes,
            productos
        } = data;

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });

        try {
            // 1) Mapear productos → estructura esperada por createDetalleCompraRecibidos
            const productosRecibidos = productos.map((p) => ({
                id_detallecompr_solicitado: p.id_detcompsol,
                idarticulo_detcomprec: p.id_artic,
                cantidad_recibida: p.cantidad_facturada,
                precio: p.precio,
                descuento: p.descuento
            }));

            // 2) Crear detalle_compra_recibido (parcial por esta factura) CON transacción
            const detallesRecibidos =
                await Detalle_Compra_RecibidoService.createDetalleCompraRecibidos(
                    id_comp,
                    productosRecibidos,
                    t
                );

            // 3) Mapa para ligar cada id_detcompsol → detalle_recibido
            const mapDetRec = new Map<string, any>();
            detallesRecibidos.forEach((dr: any) => {
                mapDetRec.set(dr.id_detallecompr_solicitado, dr);
            });

            // 4) Construir el payload TIPADO para LotesSolicitado
            const dataLotes: IDataLotesRecibidos = {
                id_comp,
                id_empleado_registro_lotes: String(id_empleado_registro_lotes),
                productos: []
            };

            for (const p of productos) {
                const detRec = mapDetRec.get(p.id_detcompsol);

                if (!detRec) {
                    throw new Error(
                        `No se encontró detalle_compra_recibido para el detalle solicitado ${p.id_detcompsol}`
                    );
                }

                // 4.1) Mapear lotes del front → ILoteRecibido
                const lotes_en_factura: ILoteRecibido[] = p.lotes.map((loteFront) => ({
                    numerolote_lote: loteFront.numerolote_lote,
                    id_detallecompr_recibido: detRec.id_detcomprec,
                    fechavencimiento_lote: new Date(loteFront.fechavencimiento_lote),
                    cantidad_lote: loteFront.cantidad_lote,
                    observacion_lote: loteFront.observacion_lote ?? undefined
                }));

                const detalleSolicitado: IDetalleSolicitado = {
                    id_detallecompr_solicitado: p.id_detcompsol,
                    precio: p.precio,
                    lotes: lotes_en_factura
                };

                dataLotes.productos.push(detalleSolicitado);

                // 4.2) Crear LotesSolicitadosCompra CON transacción
                await LotesSolicitadoCompraRepository.create(
                    dataLotes,
                    t
                );

                // 4.2) Crear detalle_factura ligado al detalle_recibido (si lo ocupas)

                await Detalle_Factura_Compra_ProveedorRepository.create(
                    {
                        id_factura_compra_proveedor: id_factura_proveedor,
                        id_detallecomprec_det_factura_compr_prov: detRec.id_detcomprec,
                    },
                    { transaction: t }
                );

            }

            // 5) Ahora sí, mandas el payload TIPADO como “recibo LoteSolicitado”

            await t.commit();

            return {
                ok: true,
                mensaje: 'Captura completa registrada correctamente'
            };
        } catch (error) {
            await t.rollback();
            console.error('Error en guardarCapturaCompleta:', error);
            throw error;
        }
    }

}