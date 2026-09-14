import { QueryOptionsWithType, QueryTypes, Transaction } from "sequelize";
import { dbLocal, dbPoly } from "../../../../config/db";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";
import { Detalle_Compra_RecibidosRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Recibido.repository";
import { ArticuloRepository } from "../../../Catalogos/Articulos/repositories/Articulo.repository";
import { LotesArticuloSucursalRepository } from "../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Empresa_SucursalRepository } from "../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { Grupo_Empresa_Lista_PrecioRepository } from "../../../Comercial/Precios/repositories/Grupo_Empresa_Lista_Precio.repository";
import { Margen_Ganancia_ListaRepository } from "../../../Comercial/Precios/repositories/Margen_Ganancia_Lista.repository";
import { Margen_Especial_ArticuloRepository } from "../../../Comercial/Precios/repositories/Margen_Especial_Articulo.repository";
import { DetalleListaPreciosRepository } from "../../../Comercial/Precios/repositories/Detalle_Lista_Precio.repository";
import { ICreateOrUpdateIDetalleListaPrecio } from "../../../Comercial/Precios/interface/Detalle_Lista_Pecios.interface";
import Detalle_Compra_Solicitado from "../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado";
import ListaPrecio from "../../../Comercial/Precios/model/Lista_Precio";
import Factura_Compra_Proveedor from "../model/Factura_Compra_Proveedor";
import Detalle_Factura_Compra_Proveedor from "../model/Detalle_Factura_Compra_Proveedor";

export const Detalle_Factura_Compra_ProveedorService = {
    modificarLotesYDetallesRecibidosFacturaProveedor: async (data: IModificarLotesDetalleFacturaDTO, usuario_empleado_chequeo: string) => {
        // console.log("modificarLotesYDetallesRecibidosFacturaProveedor", { data, usuario_empleado_chequeo });

        // Validar que la factura esté en estado R o C (no chequeada aún)
        const detalleCheck = await Detalle_Factura_Compra_ProveedorRepository.getByPK(data.id_factura_proveedor_detalle).catch(() => null);
        if (detalleCheck) {
            const facturaCheck = await Factura_Compra_Proveedor.findByPk(detalleCheck.id_factura_compra_proveedor).catch(() => null);
            if (facturaCheck && !['C', 'R'].includes((facturaCheck as any).estado_factura_proveedor)) {
                throw new Error('Solo se pueden modificar lotes de facturas en estado Recibida (R) o Capturada (C).');
            }
        }

        // Actualizar precio/descuento/IVA si vienen en el payload
        if (data.precio !== undefined || data.descuento_pct !== undefined || data.iva_pct !== undefined) {
            const updateFields: Record<string, number> = {};
            if (data.precio !== undefined)        updateFields.precio_articulo_factura   = data.precio;
            if (data.descuento_pct !== undefined) updateFields.descuento_articulo_factura = data.descuento_pct;
            if (data.iva_pct !== undefined)       updateFields.iva_articulo_factura       = data.iva_pct;
            await Detalle_Factura_Compra_Proveedor.update(updateFields, {
                where: { id_factura_proveedor_detalle: data.id_factura_proveedor_detalle },
            });
        }

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });

        try {
            // 1) Marcar detalle como recibido
            const detalle = await Detalle_Factura_Compra_ProveedorRepository.marcarDetalleFacturaCompraProveedorComoRecibido(
                data.id_factura_proveedor_detalle, t
            );

            // 2) Actualizar estado factura → R (Recibida)
            await Factura_Compra_ProveedorRepository.recibirFacturaCompraProveedor(
                detalle.id_factura_compra_proveedor, t, usuario_empleado_chequeo
            );

            // 3) Obtener id_artic
            let id_artic: string | null = detalle.id_artic ?? null;
            if (!id_artic && detalle.id_detcompsol) {
                const sol = await Detalle_Compra_Solicitado.findByPk(detalle.id_detcompsol, { transaction: t });
                id_artic = sol?.idarticulo_detcompsol ?? null;
            }

            const precioBase   = Number(detalle.precio_articulo_factura ?? 0);
            const descPct      = Number(detalle.descuento_articulo_factura ?? 0);
            const costoNeto    = precioBase * (1 - descPct / 100);
            const cantidadNueva = data.lotes.reduce((sum, l) => sum + Number(l.cantidad_lote || 0), 0);

            // 4) Calcular costo promedio ANTES de registrar el nuevo lote
            //    (así el lote entrante no contamina los "existentes")
            let costoPromedioActualizado = costoNeto;
            let modeloArticulo: any = null;
            let grupoEmpresa: any = null;

            if (id_artic && data.id_empresa) {
                modeloArticulo = await ArticuloRepository.getByPK(id_artic, { transaction: t });
                grupoEmpresa   = await Empresa_SucursalRepository.getGrupo(data.id_empresa, { transaction: t });

                if (grupoEmpresa) {
                    const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(
                        grupoEmpresa.idgrup_empre, { transaction: t }
                    );
                    const { costoPromedio, totalCantidad } =
                        await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(
                            id_artic, empresas, modeloArticulo.cod_int_artic, costoNeto, { transaction: t }
                        );
                    console.log("[PRECIO] Existentes:", totalCantidad, "@ promedio:", costoPromedio, "| Nuevas:", cantidadNueva, "@ costo:", costoNeto);
                    const totalUnidades = totalCantidad + cantidadNueva;
                    costoPromedioActualizado = totalUnidades > 0
                        ? (costoPromedio * totalCantidad + costoNeto * cantidadNueva) / totalUnidades
                        : costoNeto;
                    console.log("[PRECIO] Costo promedio actualizado:", costoPromedioActualizado);
                }
            }

            // 5) Registrar los lotes recibidos en inventario
            await Detalle_Compra_RecibidosRepository.updateLoteDetalleComproRecibido(data, t);

            // 6) Actualizar precios en ERP y PolyDB
            if (id_artic && data.id_empresa && modeloArticulo && grupoEmpresa) {
                await dbPoly.query(`
                    INSERT INTO public.almacenes1
                        (empcdempn, almcdalmn, artcdartn, almultctn, almcfeultd, almcosprn, almexistn)
                    VALUES
                        (:empcdempn, :almcdalmn, :codIntArtic, :costoNeto, NOW(), :costoPromedioActualizado, 0)
                    ON CONFLICT (empcdempn, almcdalmn, artcdartn)
                    DO UPDATE SET
                        almultctn = EXCLUDED.almultctn,
                        almcfeultd = EXCLUDED.almcfeultd,
                        almcosprn = EXCLUDED.almcosprn
                `, {
                    replacements: {
                        empcdempn: 99999,
                        almcdalmn: 1,
                        codIntArtic: modeloArticulo.cod_int_artic,
                        costoNeto,
                        costoPromedioActualizado,
                    },
                    type: QueryTypes.INSERT,
                });

                const listasDePrecioGrupo = await Grupo_Empresa_Lista_PrecioRepository
                    .getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
                const idsListasGrupo = listasDePrecioGrupo.map(l => l.id_list_precio);

                const margenesCat = (await Margen_Ganancia_ListaRepository.getByProducto(
                    modeloArticulo.id_categoria,
                    modeloArticulo.id_presentacion,
                    { transaction: t }
                )).filter(m => idsListasGrupo.includes(m.id_lista_precio));
                const margenesCatMap = new Map(margenesCat.map(m => [m.id_lista_precio, Number(m.margen)]));

                for (const idLista of idsListasGrupo) {
                    let margenPct: number | null = await Margen_Especial_ArticuloRepository
                        .getMargenVigenteByListaYArticulo(idLista, id_artic, { transaction: t });
                    if (margenPct === null) margenPct = margenesCatMap.get(idLista) ?? null;
                    if (margenPct === null) continue;

                    const divisor = 1 - (margenPct / 100);
                    if (divisor <= 0) {
                        console.warn(`Margen inválido (${margenPct}%) en lista ${idLista} — se omite`);
                        continue;
                    }

                    const precioPorLista = costoPromedioActualizado / divisor;
                    if (!Number.isFinite(precioPorLista) || precioPorLista <= 0) {
                        console.warn(`Precio calculado inválido (${precioPorLista}) — se omite`);
                        continue;
                    }

                    await DetalleListaPreciosRepository.updateOrCreate({
                        id_lista_precio: idLista,
                        id_artic,
                        precios: precioPorLista,
                    }, { transaction: t });

                    try {
                        const listaRow = await ListaPrecio.findByPk(idLista, {
                            attributes: ['cod_int_lista_precio'], raw: true,
                        }) as any;
                        const codGrupo = listaRow?.cod_int_lista_precio;
                        if (codGrupo && modeloArticulo.cod_int_artic) {
                            const margenPoly = precioPorLista > 0
                                ? ((precioPorLista - costoPromedioActualizado) / precioPorLista) * 100
                                : 0;
                            await dbPoly.query(`
                                INSERT INTO preciogpo (grpcdgrpn, artcdartn, grpprecin, grpcoston, grpmargen, grpstatuc, grpfechad, grppreofn, grpfecofD, grppzalmn, grpmulOfc)
                                VALUES (:codGrupo, :codArtic, :precio, :costo, :margen, 'A', CURRENT_DATE, NULL, NULL, NULL, 'N')
                                ON CONFLICT (grpcdgrpn, artcdartn)
                                DO UPDATE SET
                                    grpprecin = EXCLUDED.grpprecin,
                                    grpcoston = EXCLUDED.grpcoston,
                                    grpmargen = EXCLUDED.grpmargen,
                                    grpstatuc = 'A',
                                    grpfechad = CURRENT_DATE
                            `, {
                                type: QueryTypes.INSERT,
                                replacements: {
                                    codGrupo,
                                    codArtic: modeloArticulo.cod_int_artic,
                                    precio: precioPorLista,
                                    costo: costoPromedioActualizado,
                                    margen: margenPoly,
                                },
                            });
                        }
                    } catch (polyErr) {
                        console.error('Error sincronizando precio en PolyDB:', polyErr);
                    }
                }
            }

            await t.commit();
            return detalle;

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    guardarLineaFactura: async (id_factura: string, linea: any) => {
        const result = await Detalle_Factura_Compra_ProveedorRepository.guardarLineaFactura(id_factura, linea);
        await Factura_Compra_ProveedorRepository.recalcularTotales(id_factura);
        return result;
    },

    getLineasFactura: async (id_factura: string) => {
        return await Detalle_Factura_Compra_ProveedorRepository.getLineasFactura(id_factura);
    },
}
