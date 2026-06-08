import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { IActualizarEncabezadoFacturaDTO, ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor, IGuardarCapturaCompletaControllerDTO } from "../interface/Factura_Compra_Proveedor.interfece";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { ICrearDetallesFacturaRepoDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";
import { Lote_Factura_Compra_ProveedorRepository } from "../repositories/Lote_Factura_Compra_ProveedorRepository.repository";
import { ICrearLotesFacturaRepoDTO } from "../interface/Lote_Factura_Compra_Proveedor.interface";
import { Compra_ProveedorRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { EmpleadoRepository } from "../../../RRHH/repositories/Empleado.repository";
import { clasificarDetalleFactura, separarDetallesPorStatus } from "../helpers/facturasLotesClasificador";
import { v4 as uuidv4 } from 'uuid';
import { Detalle_Compra_NegadosRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Negado.repository";
import { calcularTotalesFactura } from "../helpers/facturaTotale";
import { ICreaterOrUdateLotesArticuloSucursal } from "../../../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { LotesArticuloSucursalRepository } from "../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { NotasCreditoProveedorRepository } from "../../../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository";
import { Faltante_Factura_ProveedorRepository } from "../../../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository";
import { CompraGeneralRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_General.repository";
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
export const Factura_Compra_ProveedorService = {

    actualizarEncabezado: async (id_factura_proveedor: string, data: IActualizarEncabezadoFacturaDTO) => {
        return await Factura_Compra_ProveedorRepository.actualizarEncabezado(id_factura_proveedor, data);
    },

    getFacturasPorCompraProveedor: async (id_comp: string) => {
        return await Factura_Compra_ProveedorRepository.getFacturasPorCompraProveedor(id_comp);
    },

    getFacturaCompleta: async (id_factura_proveedor: string) => {
        const resultado = await Factura_Compra_ProveedorRepository.getFacturaCompleta(id_factura_proveedor);
        if (!resultado) throw new Error('Factura no encontrada');
        return resultado;
    },
    getAllConFiltroDeEstado: async () => {
        return await Factura_Compra_ProveedorRepository.getAllConFiltroDeEstado();
    },
    finalizarChequeoFacturaProveedor: async (
        id_factura_proveedor: string,
        id_referencia_persona: string,
    ) => {


        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            // 1) Traer factura + detalles (DENTRO de TX + lock)
            const { factura, detalles } =
                await Factura_Compra_ProveedorRepository.getFacturaConDetallesParaGuardar(
                    id_factura_proveedor,
                    t
                );

            //console.log(factura)
            // 2) Clasificar
            const detallesClasificados = (detalles || []).map((d: any) => ({
                ...d,
                resumen: clasificarDetalleFactura({
                    cantidad_articulo_facturada: d.cantidad_articulo_facturada,
                    lotes_factura_compra: d.lotes_factura_compra,
                    lotes_finales: d.lotes_finales,
                }),
            }));
            // 3) Separar por status
            const { devoluciones } = separarDetallesPorStatus(detallesClasificados);
            // 4) Calcular totales
            const totalesRecibidos = calcularTotalesFactura(detallesClasificados, { usarCantidad: 'RECIBIDA' });
            const totalesNegados = calcularTotalesFactura(detallesClasificados, { usarCantidad: 'NEGADA' });
            const totalesFacturados = calcularTotalesFactura(detallesClasificados, { usarCantidad: 'FACTURADA' });
            // 5) Insertar negados (EFICIENTE)
            if (devoluciones.length > 0) {
                const now = new Date();
                const limite = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
                // OJO: evita .filter + .map doble si ya sabes que devoluciones > 0
                const detallesNegados = [];
                for (const d of detallesClasificados) {
                    if (d?.resumen?.status !== 'NEGADO') continue;
                    const idArticulo = d.detalleCompraSolicitado?.idarticulo_detcompsol;
                    if (!idArticulo) continue;
                    detallesNegados.push({
                        id_detcompneg: uuidv4(),
                        idcompr_detcompneg: factura.compra.id_comp,
                        idarticulo_detcompneg: idArticulo,
                        cantidad_negada: d.resumen.negado,
                        motivo_negado: 'FALTANTE_EN_CHEQUEO',
                        recuperado: false,
                        fecha_negado: now,
                        fecha_limite_recuperacion: limite,
                    });
                }
                if (detallesNegados.length > 0) {
                    await Detalle_Compra_NegadosRepository.agregarProductosNegados(detallesNegados, t);
                }
            }
            // 6) Actualizar totales compra proveedor
            await Compra_ProveedorRepository.compraProveedorTerminarRecibida(
                factura.compra.id_comp,
                totalesRecibidos.subtotal,
                totalesRecibidos.iva,
                t
            );
            // 7) Compra general
            await CompraGeneralRepository.actualizarTotalesCompraGeneralPorCompraProveedor(
                factura.compra.id_comp,
                totalesRecibidos.subtotal,
                totalesRecibidos.iva,
                t
            );
            // 7.5) Generar NC automática + registrar faltantes si hay diferencia
            if (totalesNegados.total > 0) {
                const folioAutoNC = `NC-AUTO-${factura.folio_factura_proveedor ?? id_factura_proveedor}-${Date.now()}`;

                const ncCreada = await NotasCreditoProveedorRepository.create(
                    {
                        id_factura_proveedor: id_factura_proveedor,
                        folio_nc: folioAutoNC,
                        motivo_nc: 'Faltante detectado en chequeo de factura (generado automáticamente)',
                        fecha_emision: new Date().toISOString().split('T')[0] as any,
                        total_nc: totalesNegados.total,
                        estado_nc: 'P',
                    },
                    { transaction: t }
                );

                // Insertar un registro por cada artículo faltante
                const filasFaltantes = [];
                for (const d of detallesClasificados) {
                    const cantFaltante = Number(d?.resumen?.negado ?? 0);
                    if (cantFaltante <= 0) continue;

                    const idArticulo = d.detalleCompraSolicitado?.idarticulo_detcompsol;
                    if (!idArticulo) continue;

                    const precioUnit = Number(d.precio_articulo_factura ?? 0);
                    const descPct = Number(d.descuento_articulo_factura ?? 0);
                    const ivaPct = Number(d.iva_articulo_factura ?? 0);
                    const precioNeto = precioUnit * (1 - descPct / 100);
                    const ivaUnit = precioNeto * (ivaPct / 100);

                    filasFaltantes.push({
                        id_faltante: uuidv4(),
                        id_nc: ncCreada.id_nc,
                        id_factura_proveedor: id_factura_proveedor,
                        id_articulo: idArticulo,
                        cantidad_faltante: cantFaltante,
                        precio_unitario: Math.round(precioNeto * 100) / 100,
                        iva_unitario: Math.round(ivaUnit * 100) / 100,
                        estado: 'P',
                    });
                }

                if (filasFaltantes.length > 0) {
                    await Faltante_Factura_ProveedorRepository.bulkCreate(filasFaltantes, { transaction: t });
                }

                // Hay faltantes → compra queda pendiente de devolución hasta que se reciba NC formal o dar entrada
                await Compra_ProveedorRepository.updateEstado(factura.compra.id_comp, 'D', { transaction: t });
            }

            // Estado de la factura: 'D' si quedaron faltantes, 'H' si todo se recibió completo
            const estadoFactura = totalesNegados.total > 0 ? 'D' : 'H';

            // 8) Darle entrada a los articulos(CREAR EL LOTE_ARTICULO_SUCURSAL Y DARLE ENTRADA EN UBICACIONLOTE_SUCURSAL)
            const lotesArticuloSucursal: ICreaterOrUdateLotesArticuloSucursal[] = [];

            for (const d of detallesClasificados) {
                const idArticulo = d.detalleCompraSolicitado?.idarticulo_detcompsol;
                if (!idArticulo) continue;

                const recibido = Number(d?.resumen?.recibido ?? 0);
                if (recibido <= 0) continue; // ✅ si no recibió, no entra a inventario

                const lotes = Array.isArray(d.lotes_finales) ? d.lotes_finales : [];
                for (const l of lotes) {
                    const cantidad = Number(l.cantidad_lote ?? 0);
                    if (cantidad <= 0) continue;

                    lotesArticuloSucursal.push({
                        id_artic: idArticulo,
                        id_empre: factura.compra.compra_general.id_empresa_sucursal, // AJUSTA si aquí debe ser sucursal
                        numero_lote_sucursal: l.numerolote_lote ?? l.numero_lote,
                        fecha_venci_lote_sucursal: l.fechavencimiento_lote ?? l.fecha_caducidad ?? null,
                        cantidad_entrada_lote: cantidad,
                        precio_costo_lote_sucursal: Number(d.precio_articulo_factura ?? 0),
                        estado_lote_sucursal: 'A',
                        id_loterecibido_lote_sucursal: l.id_loterecibido ?? l.id_lote ?? null,
                    });
                }
            }
            let lotesUpserted = [];

            if (lotesArticuloSucursal.length > 0) {
                lotesUpserted = await LotesArticuloSucursalRepository.bulkUpsert(lotesArticuloSucursal, t);
            }
            // console.log("LOTES UPSERTED", lotesUpserted)
            const stockRows = lotesUpserted.map(l => ({
                id_empresa_sucursal: factura.compra.compra_general.id_empresa_sucursal,
                id_articulo: l.id_artic,
                id_lote: l.id_lote_sucursal, // PK real
                cantidad: l.cantidad_entrada_lote,
                cantidad_apartada: 0,
            }));

            await Stock_Ubicacion_LoteRepository.bulkUpsertAcumular(stockRows, t);
            // 9) Actualizar los precios al articulo (DETALLES_LISTA_PRECIA) 

            // 10) Finalizar checado factura (guarda totales recibidos y estado correcto)
            const facturaChequeada = await Factura_Compra_ProveedorRepository.finalizarChequeoFacturaProveedor(
                id_factura_proveedor,
                id_referencia_persona,
                t,
                {
                    recibido: totalesRecibidos.subtotal,
                    iva_recibido: totalesRecibidos.iva,
                    estado_factura: estadoFactura,
                }
            );

            // 11) Crear CxP automáticamente si hay monto recibido
            const montoRecibido = +(totalesRecibidos.subtotal + totalesRecibidos.iva).toFixed(2);
            if (montoRecibido > 0) {
                const cxpExistente = await Cuenta_Por_Pagar.findOne({
                    where: { id_factura_proveedor },
                    transaction: t,
                });
                if (!cxpExistente) {
                    // Calcular fecha de vencimiento: usar la de la factura,
                    // o bien fecha_emision + días de crédito del proveedor, o +30 días por defecto
                    let fechaVencimiento: Date;
                    if (factura.fecha_vencimiento) {
                        fechaVencimiento = new Date(factura.fecha_vencimiento);
                    } else {
                        const base = factura.fecha_emision ? new Date(factura.fecha_emision) : new Date();
                        const diasCredito = Number(factura.compra?.proveedor?.diascre_prove ?? 30);
                        base.setDate(base.getDate() + diasCredito);
                        fechaVencimiento = base;
                    }

                    await Cuenta_Por_Pagar.create({
                        id_cxp:               uuidv4(),
                        id_factura_proveedor,
                        id_proveedor:         factura.compra.idprove_comp,
                        folio_factura:        factura.folio_factura_proveedor ?? null,
                        fecha_factura:        factura.fecha_emision ?? null,
                        fecha_vencimiento:    fechaVencimiento,
                        monto_total:          montoRecibido,
                        monto_pagado:         0,
                        saldo_pendiente:      montoRecibido,
                        estatus_cxp:          'PEN',
                        notas:                `Generada automáticamente al ${estadoFactura === 'H' ? 'checar' : 'recepcionar con faltantes'} la factura ${factura.folio_factura_proveedor ?? id_factura_proveedor}`,
                        id_empleado_registro: id_referencia_persona ?? null,
                    }, { transaction: t });
                }
            }

            // 12) Commit
            await t.commit();
            return facturaChequeada;
        } catch (err) {
            try {
                await t.rollback();
            } catch (err) {
                console.log('[PERF] rollback FAILED:', err);
            }

            throw err;
        }
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

    getFacturaEnCaptura: async (id_comp: string) => {
        return await Factura_Compra_ProveedorRepository.getFacturaEnCaptura(id_comp);
    },


    guardarCapturaCompleta: async (data: IGuardarCapturaCompletaControllerDTO) => {
        const { id_comp, id_factura_compra_proveedor, id_empleado_registro_lotes, productos } = data;

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const detallesPayload: ICrearDetallesFacturaRepoDTO = {
                id_factura_compra_proveedor,
                detalles: productos.map((p: any) => ({
                    id_detcompsol: p.id_detcompsol ?? null,
                    id_artic: p.id_artic ?? null,
                    cantidad_articulo_facturada: p.cantidad_facturada,
                    precio_articulo_factura: p.precio,
                    descuento_articulo_factura: p.descuento ?? 0,
                    iva_articulo_factura: p.iva
                }))
            };


            const detallesCreados = await Detalle_Factura_Compra_ProveedorRepository.createMultiple(detallesPayload, t);

            // Mapa por índice para evitar colisión cuando id_detcompsol es null (extras)
            const mapDetPorIndice = new Map<number, string>();
            detallesCreados.forEach((d: any, i: number) => {
                mapDetPorIndice.set(i, d.id_factura_proveedor_detalle);
            });

            const lotesPayload: ICrearLotesFacturaRepoDTO = {
                lotes: productos.flatMap((p: any, i: number) => {
                    const idDetFactura = mapDetPorIndice.get(i);
                    if (!idDetFactura) {
                        throw new Error(`No se encontró detalle creado para producto índice=${i}`);
                    }

                    return p.lotes.map((l: any) => ({
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

            // Recalcular totales de la factura leyendo TODOS sus detalles en BD
            // (incluye tanto los recién creados como los ya guardados línea por línea)
            await Factura_Compra_ProveedorRepository.recalcularTotales(id_factura_compra_proveedor, t);

            // Registrar al empleado y marcar estado factura como 'R' (lista para chequeo)
            // El status SIEMPRE pasa a 'R' aunque no llegue el empleado
            const empleado = id_empleado_registro_lotes
                ? await EmpleadoRepository.getByIdFlexible(id_empleado_registro_lotes)
                : null;

            await Factura_Compra_ProveedorRepository.actualizarEmpleadoYEstado(
                id_factura_compra_proveedor,
                empleado?.id_empleado ?? null,
                t
            );

            // Recalcular total_comp_factura de la compra sumando todas sus facturas (idempotente, no acumula)
            await Compra_ProveedorRepository.recalcularTotalesDesdeFacturas(id_comp, t);

            // Compra general (acumula por diseño — deja el comportamiento existente)
            // Se calcula desde los totales ya recalculados de la factura
            // (no se toca para no romper otros flujos)

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