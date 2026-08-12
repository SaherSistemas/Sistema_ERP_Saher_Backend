import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { dbLocal } from '../../../../config/db';

import { Op } from 'sequelize';
import Compra_General from '../../Ordenes-Compra/model/Compra_General';
import Compra_Proveedor from '../../Ordenes-Compra/model/Compra_Proveedor';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Detalle_Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor';
import Lote_Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Lote_Factura_Compra_Proveedor';
import Detalle_Compra_Recibido from '../../Ordenes-Compra/model/Detalle_Compra_Recibido';
import LotesRecibidosCompra from '../../../../models/LotesYCaducidad/LotesRecibidosCompra';
import Cuenta_Por_Pagar from '../../../Finanzas/Cuentas_Por_Pagar/model/Cuenta_Por_Pagar.model';
import Proveedor from '../../Proveedores/model/Proveedor';


export interface ILoteDirectaDTO {
    numero_lote: string;
    fecha_caducidad?: string | null;
    cantidad: number;
}

export interface IItemDirectaDTO {
    id_artic: string;
    cantidad: number;
    precio_unitario: number;
    descuento_pct?: number;
    iva_pct?: number;
    lotes: ILoteDirectaDTO[];
}

export interface ICompraDirectaDTO {
    id_proveedor: string;
    id_empresa_sucursal: string;
    folio_factura: string;
    fecha_emision: string;
    items: IItemDirectaDTO[];
    id_empleado_registra?: string | null;
}

export const CompraDirectaService = {
    registrar: async (data: ICompraDirectaDTO) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            const ahora = new Date();
            const totalSinIva = data.items.reduce((sum, item) => {
                const neto = item.precio_unitario * item.cantidad * (1 - (item.descuento_pct ?? 0) / 100);
                return sum + neto;
            }, 0);
            const totalIva = data.items.reduce((sum, item) => {
                const neto = item.precio_unitario * item.cantidad * (1 - (item.descuento_pct ?? 0) / 100);
                return sum + neto * ((item.iva_pct ?? 0) / 100);
            }, 0);
            const totalConIva = totalSinIva + totalIva;

            // 1) Compra_General
            const idCompraGeneral = uuidv4();
            await Compra_General.create({
                id_compra_general: idCompraGeneral,
                id_interno_compra_gen: `DIRECTA-${Date.now()}`,
                fecha_inicio: ahora,
                fecha_fin_captura: ahora,
                estado_comp: 'A',   // En proceso — almacén debe checar
                tipo_compra: 'DIRECTA',
                total_compra_general: totalSinIva,
                total_iva_compra_general: totalIva,
                id_empresa_sucursal: data.id_empresa_sucursal,
            } as any, { transaction: t });

            // 2) Compra_Proveedor — estado 'K': lotes registrados, pendiente de checado
            const idComp = uuidv4();
            await Compra_Proveedor.create({
                id_comp: idComp,
                idprove_comp: data.id_proveedor,
                id_compra_general: idCompraGeneral,
                estado_comp: 'K',
                total_comp_factura: totalSinIva,
                total_iva_factura: totalIva,
                total_comp_recibido: totalSinIva,
                total_iva_recibido: totalIva,
                inicio_de_compra_proveedor: new Date(data.fecha_emision),
                inicio_de_registro_lotes: ahora,
                fin_de_registro_lotes: ahora,
                id_empleado_compra: data.id_empleado_registra ?? null,
                id_empleado_registro_lotes: data.id_empleado_registra ?? null,
            } as any, { transaction: t });

            // 3) Verificar folio duplicado para este proveedor
            const comprasDelProveedor = await Compra_Proveedor.findAll({
                where: { idprove_comp: data.id_proveedor },
                attributes: ['id_comp'],
                raw: true,
            });
            const idsCompras = comprasDelProveedor.map((c: any) => c.id_comp);
            if (idsCompras.length > 0) {
                const folioExistente = await Factura_Compra_Proveedor.findOne({
                    where: {
                        folio_factura_proveedor: data.folio_factura,
                        id_compra_prove_factura: { [Op.in]: idsCompras },
                    },
                    transaction: t,
                });
                if (folioExistente) {
                    throw new Error(`La factura con folio "${data.folio_factura}" ya existe para este proveedor.`);
                }
            }

            // 3) Factura_Compra_Proveedor
            const idFactura = uuidv4();

            // calcular fecha de vencimiento basada en días de crédito del proveedor
            const proveedorData = await Proveedor.findByPk(data.id_proveedor, {
                attributes: ['diascre_prove'],
                transaction: t,
            });
            const diasCredito = Number(proveedorData?.dataValues?.diascre_prove ?? 30);
            const fechaVencimiento = new Date(data.fecha_emision);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito);

            // estado_factura_proveedor: 'R' = recibida, lista para que almacén cheque
            await Factura_Compra_Proveedor.create({
                id_factura_proveedor: idFactura,
                id_compra_prove_factura: idComp,
                tipo_origen: 'COMPRA',
                folio_factura_proveedor: data.folio_factura,
                estado_factura_proveedor: 'R',
                fecha_emision: data.fecha_emision,
                fecha_vencimiento: fechaVencimiento,
                total_factura_proveedor: totalSinIva,
                total_iva_factura: totalIva,
                total_recibido_factura: totalSinIva,
                total_iva_recibido_factura: totalIva,
                estatus_pago_factura: 'PENDIENTE',
                url_PDF: '',
                url_XML: '',
                inicio_de_registro_lotes: ahora,
                fin_de_registro_lotes: ahora,
                id_empleado_registro_lotes: data.id_empleado_registra ?? null,
            } as any, { transaction: t });

            for (const item of data.items) {
                const precioNeto = item.precio_unitario * (1 - (item.descuento_pct ?? 0) / 100);

                // 4a) Detalle_Factura_Compra_Proveedor
                const idDetFactura = uuidv4();
                await Detalle_Factura_Compra_Proveedor.create({
                    id_factura_proveedor_detalle: idDetFactura,
                    id_factura_compra_proveedor: idFactura,
                    id_detcompsol: null,
                    id_artic: item.id_artic,
                    cantidad_articulo_facturada: item.cantidad,
                    precio_articulo_factura: item.precio_unitario,
                    descuento_articulo_factura: item.descuento_pct ?? 0,
                    iva_articulo_factura: item.iva_pct ?? 0,
                    checado: false,   // almacén debe checar
                } as any, { transaction: t });

                // 4b) Lote_Factura_Compra_Proveedor
                for (const lote of item.lotes) {
                    await Lote_Factura_Compra_Proveedor.create({
                        id_lote_factura_compra_proveedor: uuidv4(),
                        id_det_factura_proveedor: idDetFactura,
                        numero_lote: lote.numero_lote,
                        precio_articulo_factura: precioNeto,
                        fecha_caducidad: lote.fecha_caducidad ?? null,
                        cantidad_lote: lote.cantidad,
                        observacion_lote: null,
                    } as any, { transaction: t });
                }

                // 4c) Detalle_Compra_Recibido
                const idDetRecibido = uuidv4();
                await Detalle_Compra_Recibido.create({
                    id_detcomprec: idDetRecibido,
                    idcompr_detcomprec: idComp,
                    idarticulo_detcomprec: item.id_artic,
                    cantidad_detcomprec: item.cantidad,
                    precio_detcomprec: item.precio_unitario,
                    id_detalle_factura_compra_proveedor: idDetFactura,
                } as any, { transaction: t });

                // 4d) LotesRecibidosCompra
                for (const lote of item.lotes) {
                    await LotesRecibidosCompra.create({
                        id_loterecibido: uuidv4(),
                        id_detallecompr_recibido: idDetRecibido,
                        numerolote_lote: lote.numero_lote,
                        fechavencimiento_lote: lote.fecha_caducidad ?? null,
                        cantidad_lote: lote.cantidad,
                        observacion_lote: '',
                    } as any, { transaction: t });
                }
            }

            // Inventario y precios se actualizan cuando almacén finalice el checado (K → Z → F)

            // 5) Cuenta_Por_Pagar
            await Cuenta_Por_Pagar.create({
                id_cxp: uuidv4(),
                id_factura_proveedor: idFactura,
                id_proveedor: data.id_proveedor,
                folio_factura: data.folio_factura,
                fecha_factura: data.fecha_emision,
                fecha_vencimiento: fechaVencimiento,
                monto_total: totalConIva,
                monto_pagado: 0,
                saldo_pendiente: totalConIva,
                estatus_cxp: 'PEN',
                id_empleado_registro: data.id_empleado_registra ?? null,
            } as any, { transaction: t });

            await t.commit();

            return {
                id_factura_proveedor: idFactura,
                id_compra_general: idCompraGeneral,
                id_comp: idComp,
                total_con_iva: totalConIva,
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },
};
