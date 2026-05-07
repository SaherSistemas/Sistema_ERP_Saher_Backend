import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";
import { Detalle_Compra_RecibidosRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Recibido.repository";
import { ArticuloRepository } from "../../../Catalogos/Articulos/repositories/Articulo.repository";
import { LotesArticuloSucursalRepository } from "../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Empresa_SucursalRepository } from "../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { Grupo_Empresa_Lista_PrecioRepository } from "../../../Comercial/Precios/repositories/Grupo_Empresa_Lista_Precio.repository";
import { Margen_Ganancia_ListaRepository } from "../../../Comercial/Precios/repositories/Margen_Ganancia_Lista.repository";
import { DetalleListaPreciosRepository } from "../../../Comercial/Precios/repositories/Detalle_Lista_Precio.repository";
import { ICreateOrUpdateIDetalleListaPrecio } from "../../../Comercial/Precios/interface/Detalle_Lista_Pecios.interface";
import Detalle_Compra_Solicitado from "../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado";

export const Detalle_Factura_Compra_ProveedorService = {
    modificarLotesYDetallesRecibidosFacturaProveedor: async (data: IModificarLotesDetalleFacturaDTO, usuario_empleado_chequeo: string) => {
        // console.log("modificarLotesYDetallesRecibidosFacturaProveedor", { data, usuario_empleado_chequeo });
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

            // 3) Actualizar lotes recibidos
            await Detalle_Compra_RecibidosRepository.updateLoteDetalleComproRecibido(data, t);

            // 4) Calcular precios igual que en el flujo de stock
            // Obtener id_artic: puede venir directo del detalle o via id_detcompsol
            let id_artic: string | null = detalle.id_artic ?? null;
            console.log("ID_ARTIC INICIAL:", id_artic);
            if (!id_artic && detalle.id_detcompsol) {
                const sol = await Detalle_Compra_Solicitado.findByPk(detalle.id_detcompsol, { transaction: t });
                id_artic = sol?.idarticulo_detcompsol ?? null;
            }
            console.log("ID_ARTIC DESPUES DE BUSQUEDA:", id_artic);

            if (id_artic && data.id_empresa) {
                const precioBase = Number(detalle.precio_articulo_factura ?? 0);
                const descPct = Number(detalle.descuento_articulo_factura ?? 0);
                const costoNeto = precioBase * (1 - descPct / 100);
                console.log("PRECIO BASE:", precioBase, "DESC PCT:", descPct, "COSTO NETO:", costoNeto);

                const cantidadNueva = data.lotes.reduce(
                    (sum, l) => sum + Number(l.cantidad_lote || 0), 0
                );

                const modeloArticulo = await ArticuloRepository.getByPK(id_artic, { transaction: t });
                console.log("MODELO ARTICULO:", modeloArticulo);
                const grupoEmpresa = await Empresa_SucursalRepository.getGrupo(data.id_empresa, { transaction: t });
                console.log("GRUPO EMPRESA:", grupoEmpresa);

                if (grupoEmpresa) {
                    const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(
                        grupoEmpresa.idgrup_empre, { transaction: t }
                    );

                    const { costoPromedio, totalCantidad } =
                        await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(
                            id_artic, empresas, { transaction: t }
                        );

                    const totalUnidades = totalCantidad + cantidadNueva;
                    const costoPromedioActualizado = totalUnidades > 0
                        ? (costoPromedio * totalCantidad + costoNeto * cantidadNueva) / totalUnidades
                        : costoNeto;  // si no hay stock previo, el costo promedio es el costo de esta compra

                    const listasDePrecioGrupo = await Grupo_Empresa_Lista_PrecioRepository
                        .getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
                    const idsListasGrupo = listasDePrecioGrupo.map(l => l.id_list_precio);
                    console.log("IDS LISTAS GRUPO:", idsListasGrupo);
                    const margenesFiltrados = (await Margen_Ganancia_ListaRepository.getByProducto(
                        modeloArticulo.id_categoria,
                        modeloArticulo.id_presentacion,
                        { transaction: t }
                    )).filter(m => idsListasGrupo.includes(m.id_lista_precio));
                    console.log("MARGENES FILTRADOS:", margenesFiltrados);
                    for (const margen of margenesFiltrados) {
                        const margenPct = Number(margen.margen) || 0;
                        const divisor = 1 - (margenPct / 100);

                        // Si el margen es 100 % o más el precio sería infinito — se omite
                        if (divisor <= 0) {
                            console.warn(`Margen inválido (${margenPct}%) en lista ${margen.lista_precio?.id_lista_precio} — se omite`);
                            continue;
                        }

                        const precioPorLista = costoPromedioActualizado / divisor;

                        // Última guardia: nunca guardar NaN / Infinity / negativos
                        if (!Number.isFinite(precioPorLista) || precioPorLista <= 0) {
                            console.warn(`Precio calculado inválido (${precioPorLista}) — se omite`);
                            continue;
                        }

                        const detallePrecio: ICreateOrUpdateIDetalleListaPrecio = {
                            id_lista_precio: margen.lista_precio.id_lista_precio,
                            id_artic,
                            precios: precioPorLista,
                        };
                        console.log(detallePrecio);
                        await DetalleListaPreciosRepository.updateOrCreate(detallePrecio, { transaction: t });
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
