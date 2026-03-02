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
import { EmpleadoRepository } from "../../../RRHH/repositories/Empleado.repository";
import { UsuarioRepository } from "../../../Seguridad/repositories/Usuario.repository";
import { clasificarDetalleFactura, separarDetallesPorStatus } from "../helpers/facturasLotesClasificador";
import { v4 as uuidv4 } from 'uuid';
import { Detalle_Compra_NegadosRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Negado.repository";
import { calcularTotalesFactura } from "../helpers/facturaTotale";
import { ICreaterOrUdateLotesArticuloSucursal } from "../../../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { LotesArticuloSucursalRepository } from "../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
export const Factura_Compra_ProveedorService = {
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
            // 4) Calcular totales (si los usas)
            const totalesRecibidos = calcularTotalesFactura(detallesClasificados, { usarCantidad: 'RECIBIDA' });
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

            // 10) Finalizar checado factura
            const facturaChequeada = await Factura_Compra_ProveedorRepository.finalizarChequeoFacturaProveedor(
                id_factura_proveedor,
                id_referencia_persona,
                t
            );
            // 10) Commit
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