import { Transaction } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { INotasCreditoProveedor } from "../../interface/Devolucion_NC/NotaCredito.interface";
import { Compra_ProveedorRepository } from "../../modules/Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import Compra_Proveedor from "../../modules/Compras/Ordenes-Compra/model/Compra_Proveedor";
import { NotasCreditoProveedorRepository } from "../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository";
import { Faltante_Factura_ProveedorRepository } from "../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository";
import Faltante_Factura_Proveedor from "../../models/Devolucion_NC/Faltante/Faltante_Factura_Proveedor";
import { LotesArticuloSucursalRepository } from "../../modules/Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Stock_Ubicacion_LoteRepository } from "../../modules/Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { Factura_Compra_ProveedorRepository } from "../../modules/Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository";
import Factura_Compra_Proveedor from "../../modules/Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor";
import Cuenta_Por_Pagar from "../../modules/Finanzas/Cuentas_Por_Pagar/model/Cuenta_Por_Pagar.model";
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
        }>;
    }) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            // Obtener factura + compra para conseguir id_proveedor y totales actuales
            const factura = await Factura_Compra_Proveedor.findByPk(data.id_factura_proveedor, { transaction: t });
            if (!factura) throw new Error('Factura no encontrada');
            const id_compra_proveedor = factura.id_compra_prove_factura;

            const compra = await Compra_Proveedor.findByPk(id_compra_proveedor, {
                attributes: ['id_comp', 'idprove_comp'],
                transaction: t,
            });
            if (!compra) throw new Error('Compra no encontrada');
            const id_proveedor = compra.idprove_comp;

            // Cargar los faltantes para obtener precio_unitario e iva_unitario
            const faltantesIds = data.productos.map(p => p.id_faltante).filter(Boolean) as string[];
            const faltantesDB = faltantesIds.length
                ? await Faltante_Factura_Proveedor.findAll({
                    where: { id_faltante: faltantesIds },
                    transaction: t,
                })
                : [];
            const faltanteMap = new Map(faltantesDB.map(f => [f.id_faltante, f]));

            let subtotalEntrada = 0;
            let ivaEntrada = 0;

            // Procesar cada producto
            for (const prod of data.productos) {
                const faltante = prod.id_faltante ? faltanteMap.get(prod.id_faltante) : null;
                const costo_unitario = faltante ? Number(faltante.precio_unitario) : 0;
                const iva_unitario = faltante ? Number(faltante.iva_unitario) : 0;

                subtotalEntrada += prod.cantidad * costo_unitario;
                ivaEntrada += prod.cantidad * iva_unitario;

                const lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal(
                    {
                        id_artic: prod.id_artic,
                        id_empre: data.id_empresa,
                        numero_lote_sucursal: prod.numero_lote,
                        fecha_venci_lote_sucursal: new Date(prod.fecha_caducidad),
                        cantidad_entrada_lote: prod.cantidad,
                        precio_costo_lote_sucursal: costo_unitario,
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

                // Actualizar o marcar faltante (parcial vs completo)
                if (faltante) {
                    const restante = Number(faltante.cantidad_faltante) - prod.cantidad;
                    if (restante <= 0) {
                        await Faltante_Factura_ProveedorRepository.marcarRecibidos(
                            [faltante.id_faltante],
                            { transaction: t }
                        );
                    } else {
                        await Faltante_Factura_ProveedorRepository.reducirCantidad(
                            faltante.id_faltante,
                            restante,
                            { transaction: t }
                        );
                    }
                }
            }

            // Actualizar total_recibido_factura con lo que se está dando entrada ahora
            await Factura_Compra_Proveedor.increment(
                {
                    total_recibido_factura: subtotalEntrada,
                    total_iva_recibido_factura: ivaEntrada,
                },
                { where: { id_factura_proveedor: data.id_factura_proveedor }, transaction: t }
            );

            // Crear Cuenta_Por_Pagar por el monto de los artículos recibidos
            const montoTotal = +(subtotalEntrada + ivaEntrada).toFixed(2);
            if (montoTotal > 0) {
                const fechaVencimiento = new Date();
                fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
                await Cuenta_Por_Pagar.create(
                    {
                        id_cxp: uuidv4(),
                        id_factura_proveedor: data.id_factura_proveedor,
                        id_proveedor,
                        folio_factura: factura.folio_factura_proveedor ?? null,
                        fecha_factura: factura.fecha_emision ?? null,
                        fecha_vencimiento: fechaVencimiento,
                        monto_total: montoTotal,
                        monto_pagado: 0,
                        saldo_pendiente: montoTotal,
                        estatus_cxp: 'PEN',
                        notas: 'Generada por entrada de artículos de devolución',
                    },
                    { transaction: t }
                );
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
