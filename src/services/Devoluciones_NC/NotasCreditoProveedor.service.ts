import { Transaction } from "sequelize";
import { INotasCreditoProveedor } from "../../interface/Devolucion_NC/NotaCredito.interface";
import { Compra_ProveedorRepository } from "../../modules/Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { NotasCreditoProveedorRepository } from "../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository";
import { Faltante_Factura_ProveedorRepository } from "../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository";
import { LotesArticuloSucursalRepository } from "../../modules/Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Stock_Ubicacion_LoteRepository } from "../../modules/Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { dbLocal } from "../../config/db";
import { trace } from "console";

export const NotasCreditoProveedorService = {
    createNotaDeCredito: async (data: INotasCreditoProveedor) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const compraProveedor = await Compra_ProveedorRepository.getByID(data.id_compra_proveedor)
            if (!compraProveedor) {
                //FALTA AGREGAR INFORMACION DE ERROR 
                return
            }
            await NotasCreditoProveedorRepository.create(data, { transaction: t })
            //CONSEGURI LAS NOTAS DE CREDITO DE ESA COMPRA PARA SABER SI YA TIENE MAS Y ACOMPLETA 
            const notas = await NotasCreditoProveedorRepository.getNotasCreditoByCompraProveedor(data.id_compra_proveedor, { transaction: t })


            //VERIFICAR QUE SI CUEADRAN LA COMPRA Y TOTAL 
            const totalFactura = Number(compraProveedor.total_comp_factura) + Number(compraProveedor.total_iva_factura)
            const totalRecibido = Number(compraProveedor.total_comp_recibido) + Number(compraProveedor.total_iva_recibido) + Number(data.total_nc)

            const totalNotas = notas.reduce(
                (acc, nc) => acc + Number(nc.total_nc ?? 0),
                0
            );

            const totalConNotas = totalRecibido + totalNotas;

            // 5. Comparar en centavos para evitar problemas con decimales
            const normalizar = (num: number) => Math.round(num * 100);

            // NC manual cuadra la factura → finalizar compra y cerrar faltantes pendientes
            if (normalizar(totalFactura) === normalizar(totalConNotas)) {
                await Compra_ProveedorRepository.updateEstado(
                    data.id_compra_proveedor,
                    'F',
                    { transaction: t }
                );
                // Marcar faltantes como condonados (el proveedor emitió NC, no mandará la mercancía)
                await Faltante_Factura_ProveedorRepository.marcarCondonados(
                    data.id_compra_proveedor,
                    { transaction: t }
                );
                // Cerrar la(s) NC pendiente(s) de esa compra
                await NotasCreditoProveedorRepository.marcarCerradas(
                    data.id_compra_proveedor,
                    { transaction: t }
                );
            }
            await t.commit();
            return { ok: true };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    getNotasCreditoByCompraProveedor: async (id_compra_proveedor: string) => {
        return NotasCreditoProveedorRepository.getNotasCreditoByCompraProveedor(id_compra_proveedor)
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

    darEntradaInventario: async (data: {
        id_compra_proveedor: string;
        id_empresa: string;
        productos: Array<{
            id_faltante?: string;   // viene del GET productos_pendientes → permite marcar el faltante como resuelto
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
            const ncPendiente = await NotasCreditoProveedorRepository.tienePendiente(data.id_compra_proveedor, { transaction: t });
            if (!ncPendiente) throw new Error('No hay nota de crédito pendiente para esta compra');

            // Ingresa cada producto al inventario
            for (const prod of data.productos) {
                // 1) Crear / acumular el lote en lote_articulo_sucursal
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

                // 2) Crear registro en stock_ubicacion_lote SIN ubicación
                //    → queda pendiente de acomodo (aparece en el módulo de Acomodo)
                await Stock_Ubicacion_LoteRepository.create(
                    {
                        id_empresa_sucursal: data.id_empresa,
                        id_articulo: prod.id_artic,
                        id_lote: lote.id_lote_sucursal,
                        id_ubicacion_sucursal: null,   // ← pendiente de acomodo
                        cantidad: prod.cantidad,
                        cantidad_apartada: 0,
                    },
                    t
                );
            }

            // Marcar faltantes como 'R' (Recibido) para los artículos que llegaron
            const ids_faltante = data.productos
                .map(p => p.id_faltante)
                .filter(Boolean) as string[];

            console.log(data)
            if (ids_faltante.length) {
                await Faltante_Factura_ProveedorRepository.marcarRecibidos(ids_faltante, { transaction: t });
            }

            // Si todos los faltantes de la compra ya se resolvieron → cerrar NC y finalizar compra
            const pendientesRestantes = await Faltante_Factura_ProveedorRepository.getPendientesByCompra(
                data.id_compra_proveedor,
                { transaction: t }
            );
            if (pendientesRestantes.length === 0) {
                await NotasCreditoProveedorRepository.marcarCerradas(data.id_compra_proveedor, { transaction: t });
                // La NC quedó saldada → la compra proveedor pasa a finalizada
                await Compra_ProveedorRepository.updateEstado(
                    data.id_compra_proveedor,
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
