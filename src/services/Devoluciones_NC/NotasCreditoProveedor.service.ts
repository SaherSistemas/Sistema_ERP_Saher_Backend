import { Transaction } from "sequelize";
import { INotasCreditoProveedor } from "../../interface/Devolucion_NC/NotaCredito.interface";
import { Compra_ProveedorRepository } from "../../modules/Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { NotasCreditoProveedorRepository } from "../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository";
import { Faltante_Factura_ProveedorRepository } from "../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository";
import { LotesArticuloSucursalRepository } from "../../modules/Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Stock_Ubicacion_LoteRepository } from "../../modules/Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { Factura_Compra_ProveedorRepository } from "../../modules/Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository";
import Factura_Compra_Proveedor from "../../modules/Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor";
import { dbLocal } from "../../config/db";

export const NotasCreditoProveedorService = {
    createNotaDeCredito: async (data: INotasCreditoProveedor) => {
        console.log(data)
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const factura = await Factura_Compra_Proveedor.findByPk(data.id_factura_proveedor, { transaction: t });
            if (!factura) return;

            const id_compra_proveedor = factura.id_compra_prove_factura;

            // Si ya existe una NC auto-pendiente para esta factura, aplicarle los datos
            // reales del SAT en lugar de crear un duplicado
            const ncPendiente = await NotasCreditoProveedorRepository.tienePendiente(
                data.id_factura_proveedor,
                { transaction: t }
            );
            if (ncPendiente) {
                await NotasCreditoProveedorRepository.aplicarNCFormal(
                    data.id_factura_proveedor,
                    {
                        folio_nc: data.folio_nc,
                        motivo_nc: data.motivo_nc,
                        fecha_emision: data.fecha_emision,
                        total_nc: Number(data.total_nc),
                    },
                    { transaction: t }
                );
            } else {
                await NotasCreditoProveedorRepository.create(data, { transaction: t });
            }

            // Traer todas las NCs de esta factura para sumar
            const notas = await NotasCreditoProveedorRepository.getNotasCreditoByFacturaProveedor(
                data.id_factura_proveedor,
                { transaction: t }
            );

            // Comparar totales a nivel FACTURA
            const totalFactura = Number(factura.total_factura_proveedor) + Number(factura.total_iva_factura);
            const totalRecibido = Number(factura.total_recibido_factura) + Number(factura.total_iva_recibido_factura);

            const totalNotas = notas.reduce(
                (acc, nc) => acc + Number(nc.total_nc ?? 0),
                0
            );

            const totalConNotas = totalRecibido + totalNotas;

            const normalizar = (num: number) => Math.round(num * 100);

            // La NC cuadra esta factura → cerrar solo esta factura y sus faltantes
            if (normalizar(totalFactura) === normalizar(totalConNotas)) {
                // 1) Cerrar solo esta factura
                await Factura_Compra_ProveedorRepository.updateEstadoFactura(
                    data.id_factura_proveedor,
                    'F',
                    { transaction: t }
                );
                // 2) Marcar NC(s) de esta factura como 'A' (aplicada)
                await NotasCreditoProveedorRepository.marcarAplicadas(
                    data.id_factura_proveedor,
                    { transaction: t }
                );
                // 3) Condonar faltantes de esta factura
                await Faltante_Factura_ProveedorRepository.marcarCondonadosByFactura(
                    data.id_factura_proveedor,
                    { transaction: t }
                );
                // 4) Si ya no quedan facturas en 'D' para esta compra → finalizar la compra
                const hayPendientes = await Factura_Compra_ProveedorRepository.hayFacturasEnDevolucion(
                    id_compra_proveedor,
                    { transaction: t }
                );
                if (!hayPendientes) {
                    await Compra_ProveedorRepository.updateEstado(
                        id_compra_proveedor,
                        'F',
                        { transaction: t }
                    );
                }
            }
            await t.commit();
            return { ok: true };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    getNotasCreditoByFacturaProveedor: async (id_factura_proveedor: string) => {
        return NotasCreditoProveedorRepository.getNotasCreditoByFacturaProveedor(id_factura_proveedor);
    },

    getProductosPendientes: async (compraId: string) => {
        const faltantes = await Faltante_Factura_ProveedorRepository.getPendientesByCompra(compraId);

        return faltantes.map((f: any) => ({
            id_faltante: f.id_faltante,
            articulo: {
                id_artic: f.articulo?.id_artic ?? f.id_articulo,
                cod_barr_artic: f.articulo?.cod_barr_artic ?? null,
                des_artic: f.articulo?.des_artic ?? null,
            },
            cantidad: Number(f.cantidad_faltante),
            costo_unitario: Number(f.precio_unitario),
            iva_unitario: Number(f.iva_unitario),
        }));
    },

    getProductosPendientesByFactura: async (facturaId: string) => {
        const faltantes = await Faltante_Factura_ProveedorRepository.getPendientesByFactura(facturaId);

        return faltantes.map((f: any) => ({
            id_faltante: f.id_faltante,
            id_factura_proveedor: f.id_factura_proveedor ?? null,
            articulo: {
                id_artic: f.articulo?.id_artic ?? f.id_articulo,
                cod_barr_artic: f.articulo?.cod_barr_artic ?? null,
                des_artic: f.articulo?.des_artic ?? null,
            },
            cantidad: Number(f.cantidad_faltante),
            costo_unitario: Number(f.precio_unitario),
            iva_unitario: Number(f.iva_unitario),
        }));
    },

    darEntradaInventario: async (data: {
        id_factura_proveedor: string;
        id_empresa: string;
        productos: Array<{
            id_faltante?: string;
            id_artic: string;
            cantidad: number;
            numero_lote: string;
            fecha_caducidad: string;
            costo_unitario?: number;
        }>;
    }) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const ncPendiente = await NotasCreditoProveedorRepository.tienePendiente(
                data.id_factura_proveedor,
                { transaction: t }
            );
            if (!ncPendiente) throw new Error('No hay nota de crédito pendiente para esta factura');

            // Obtener la compra desde la factura
            const factura = await Factura_Compra_Proveedor.findByPk(data.id_factura_proveedor, { transaction: t });
            const id_compra_proveedor = factura.id_compra_prove_factura;

            // Ingresa cada producto al inventario
            for (const prod of data.productos) {
                const lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal(
                    {
                        id_artic: prod.id_artic,
                        id_empre: data.id_empresa,
                        numero_lote_sucursal: prod.numero_lote,
                        fecha_venci_lote_sucursal: new Date(prod.fecha_caducidad),
                        cantidad_entrada_lote: prod.cantidad,
                        precio_costo_lote_sucursal: prod.costo_unitario ?? 0,
                        estado_lote_sucursal: 'A',
                    },
                    { transaction: t }
                );

                await Stock_Ubicacion_LoteRepository.create(
                    {
                        id_empresa_sucursal: data.id_empresa,
                        id_articulo: prod.id_artic,
                        id_lote: lote.id_lote_sucursal,
                        id_ubicacion_sucursal: null,
                        cantidad: prod.cantidad,
                        cantidad_apartada: 0,
                    },
                    t
                );
            }

            // Marcar faltantes como 'R' (Recibido)
            const ids_faltante = data.productos
                .map(p => p.id_faltante)
                .filter(Boolean) as string[];

            if (ids_faltante.length) {
                await Faltante_Factura_ProveedorRepository.marcarRecibidos(ids_faltante, { transaction: t });
            }

            // Si todos los faltantes de la compra ya se resolvieron → cerrar NCs y finalizar
            const pendientesRestantes = await Faltante_Factura_ProveedorRepository.getPendientesByCompra(
                id_compra_proveedor,
                { transaction: t }
            );
            if (pendientesRestantes.length === 0) {
                await NotasCreditoProveedorRepository.marcarCerradasByCompra(id_compra_proveedor, { transaction: t });
                await Compra_ProveedorRepository.updateEstado(
                    id_compra_proveedor,
                    'F',
                    { transaction: t }
                );
                await Factura_Compra_ProveedorRepository.updateEstadoByCompraProveedor(
                    id_compra_proveedor,
                    'F',
                    { transaction: t }
                );
            }

            await t.commit();
            return { ok: true };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

}
