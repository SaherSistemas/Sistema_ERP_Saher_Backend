import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor, IGuardarCapturaCompletaControllerDTO } from "../interface/Factura_Compra_Proveedor.interfece";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { Detalle_Compra_RecibidoService } from "../../../Compras/Ordenes-Compra/services/Detalle_Compra_Recibido.service";
import { LotesSolicitadoCompraRepository } from "../../../../repository/LotesYCaducidad/LotesSolicitadosCompra.repository";
import { IDataLotesRecibidos, IDetalleSolicitado, ILoteRecibido } from "../../../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";
import { ICrearDetallesFacturaRepoDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";
import { Lote_Factura_Compra_ProveedorRepository } from "../repositories/Lote_Factura_Compra_ProveedorRepository.repository";
import { ICrearLotesFacturaRepoDTO } from "../interface/Lote_Factura_Compra_Proveedor.interface";
import { Compra_ProveedorRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { CompraGeneralRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_General.repository";

export const Factura_Compra_ProveedorService = {
    getAllConFiltroDeEstado: async () => {
        return await Factura_Compra_ProveedorRepository.getAllConFiltroDeEstado();
    },
    getByIDComp: async (id_comp: string) => {
        return await Factura_Compra_ProveedorRepository.getByID(id_comp);
    },
    getDetallesFacturaPorIdFacturaProveedor: async (id_factura_proveedor: string) => {
        return await Factura_Compra_ProveedorRepository.getFacturaConDetalles(id_factura_proveedor);
    },

    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        return await Factura_Compra_ProveedorRepository.guardarFacturaEIniciarCapturaLotes(data)
    },


    guardarCapturaCompleta: async (data: IGuardarCapturaCompletaControllerDTO) => {
        const { id_comp, id_factura_compra_proveedor, id_empleado_registro_lotes, productos } = data;

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            //TOTALES
            let totalSinIva = 0;
            let totalIva = 0;

            for (const p of productos) {
                // console.log(p)
                const cantidad = Number(p.cantidad_facturada);
                const precio = Number(p.precio);
                const descuentoPct = Number(p.descuento ?? 0);
                const ivaPct = Number(p.iva ?? 0);

                const importeBruto = precio * cantidad;
                const descuentoMonto = importeBruto * (descuentoPct / 100);
                const importeNeto = importeBruto - descuentoMonto;
                const ivaMonto = importeNeto * (ivaPct / 100);
                //console.log("IVAMONOT", ivaMonto);
                totalSinIva += importeNeto;
                totalIva += ivaMonto;
            }
            //FACTURA
            const actualizarFacturaTotales = await Factura_Compra_ProveedorRepository.actualizarTotalesFactura(
                id_factura_compra_proveedor,
                totalSinIva,
                totalIva,
                id_empleado_registro_lotes,
                t
            );
            //COMPRA PROVEEDOR
            const actualizarCompraProveedorTotales = await Compra_ProveedorRepository.actualizarTotalesCompraProveedor(
                id_comp,
                totalSinIva,
                totalIva,
                t
            );
            //COMPRA GENERAL 
            const actualizarCompraGeneralTotales = await CompraGeneralRepository.actualizarTotalesCompraGeneralPorCompraProveedor(
                id_comp,
                totalSinIva,
                totalIva,
                t
            );
            const detallesPayload: ICrearDetallesFacturaRepoDTO = {
                id_factura_compra_proveedor,
                detalles: productos.map((p) => ({
                    id_detcompsol: p.id_detcompsol,
                    cantidad_articulo_facturada: p.cantidad_facturada,
                    precio_articulo_factura: p.precio,
                    descuento_articulo_factura: p.descuento ?? 0,
                    iva_articulo_factura: p.iva
                }))
            };


            const detallesCreados = await Detalle_Factura_Compra_ProveedorRepository.createMultiple(detallesPayload, t);

            //console.log(detallesCreados)

            const mapDet = new Map<string, string>();
            for (const d of detallesCreados) {
                mapDet.set(d.id_detcompsol, d.id_factura_proveedor_detalle);
            }

            const lotesPayload: ICrearLotesFacturaRepoDTO = {
                lotes: productos.flatMap((p) => {
                    const idDetFactura = mapDet.get(p.id_detcompsol);
                    if (!idDetFactura) {
                        throw new Error(`No se encontró detalle creado para id_detcompsol=${p.id_detcompsol}`);
                    }

                    return p.lotes.map((l) => ({
                        id_det_factura_proveedor: idDetFactura,
                        numero_lote: l.numero_lote,
                        fecha_caducidad: l.fecha_caducidad,
                        precio_articulo_factura: p.precio,
                        cantidad_lote: l.cantidad,
                        observacion_lote: l.observacion_lote ?? null
                    }));
                })
            };

            await Lote_Factura_Compra_ProveedorRepository.createMultiple(lotesPayload, t);

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