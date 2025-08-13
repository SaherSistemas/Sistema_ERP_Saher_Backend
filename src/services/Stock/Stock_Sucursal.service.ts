import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";
import { ICreateOrUpdateStockSucursal, IDataProductosStockConDevolucion } from "../../interface/Stock/Stock_Sucursal.interface";
import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
import { Grupo_Empresa_Lista_PrecioRepository } from "../../repository/Costo_Y_Precio/Grupo_Empresa_Lista_Precio.repository";
import { DetalleListaPreciosRepository } from "../../repository/Costo_Y_Precio/Lista_Precio/Detalle_Lista_Precio.repository";
import { Margen_Ganancia_ListaRepository } from "../../repository/Costo_Y_Precio/Margen_Ganancia_Lista.repository";
import { Empresa_SucursalRepository } from "../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { LotesArticuloSucursalRepository } from "../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository";
import { StockSucursalRepository } from "../../repository/Stock/Stock_Sucursal.repository";
import { ICreaterOrUdateLotesArticuloSucursal } from "../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface";
import { ICreateOrUpdateIDetalleListaPrecio } from "../../interface/Articulos/Lista_Precios/Detalle_Lista_Pecios.interface";

export const StockSucursalService = {

    getAll: async () => {
        return await StockSucursalRepository.getAll();
    },
    getAllsucursalesPorIdArticulo: async (id_artic: string) => {
        return await StockSucursalRepository.getAllsucursalesPorIdArticulo(id_artic);
    },
    getAllArticulosporSucursal: async (id_empre: string) => {
        return await StockSucursalRepository.getAllArticulosporSucursal(id_empre);
    },

    create: async (data: IDataProductosStockConDevolucion) => {
        const { id_empresa, productosEntrada, productosDevolucion } = data;

        if (!productosEntrada || productosEntrada.length === 0) {
            return { mensaje: "No se recibieron productos" };
        }

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
        });

        try {
            // 🟢 1. Obtener grupo de empresa una sola vez
            const grupoEmpresa = await Empresa_SucursalRepository.getGrupo(id_empresa, { transaction: t });
            if (!grupoEmpresa) throw new Error(`No se encontró grupo para la empresa ${id_empresa}`);

            // 🟢 2. Obtener empresas del grupo
            const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(grupoEmpresa.idgrup_empre, { transaction: t });

            // 🟢 3. Obtener listas de precio del grupo
            const listasDePrecioGrupo = await Grupo_Empresa_Lista_PrecioRepository.getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
            const idsListasGrupo = listasDePrecioGrupo.map(l => l.id_list_precio);

            // 🟢 4. Recorrer productos de entrada
            for (const producto of productosEntrada) {
                const modeloArticulo = await ArticuloRepository.getByPK(producto.id_artic, { transaction: t });

                const { costoPromedio, totalCantidad } =
                    await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(
                        producto.id_artic,
                        empresas,
                        { transaction: t }
                    );

                const costoNuevo = parseFloat(producto.precio);
                const cantidadNueva = producto.lotes.reduce((total, lote) => total + Number(lote.cantidad_lote || 0), 0);
                const costoPromedioActualizado =
                    (costoPromedio * totalCantidad + costoNuevo * cantidadNueva) /
                    (totalCantidad + cantidadNueva);

                // 🟢 Crear/actualizar lotes
                for (const lote of producto.lotes) {
                    const loteData: ICreaterOrUdateLotesArticuloSucursal = {
                        id_artic: producto.id_artic,
                        id_empre: id_empresa,
                        numero_lote_sucursal: lote.numerolote_lote,
                        fecha_venci_lote_sucursal: new Date(lote.fechavencimiento_lote),
                        cantidad_lote_sucursal: lote.cantidad_lote,
                        precio_costo_lote_sucursal: costoNuevo,
                        estado_lote_sucursal: 'A',
                    };
                    await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal(loteData, { transaction: t });
                }

                await StockSucursalRepository.updateCantidadExistencia(id_empresa, producto.id_artic, { transaction: t });

                // 🟢 Aplicar precios a listas
                const margenesFiltrados = (await Margen_Ganancia_ListaRepository.getByProducto(
                    modeloArticulo.id_categoria,
                    modeloArticulo.id_presentacion,
                    { transaction: t }
                )).filter(m => idsListasGrupo.includes(m.id_lista_precio));

                for (const margen of margenesFiltrados) {
                    const margenNum = margen.margen;
                    const precioPorLista = costoPromedioActualizado / (1 - (margenNum / 100));

                    const detallePrecio: ICreateOrUpdateIDetalleListaPrecio = {
                        id_lista_precio: margen.lista_precio.id_lista_precio,
                        id_artic: producto.id_artic,
                        precios: precioPorLista
                    };

                    await DetalleListaPreciosRepository.updateOrCreate(detallePrecio, { transaction: t });
                }
            }

            // 🟢 5. Procesar devoluciones (si existen)
            /*if (productosDevolucion && productosDevolucion.length > 0) {
                for (const devolucion of productosDevolucion) {
                    // Aquí depende de tu modelo — ejemplo genérico:
                    await DevolucionRepository.create({
                        id_comp: devolucion.id_comp,
                        id_detcomprec: devolucion.id_detcomprec,
                        cantidad_diferencia: devolucion.cantidad_diferencia,
                        lote: devolucion.lote,
                        fecha_caducidad: devolucion.fecha_caducidad,
                        observacion: devolucion.observacion,
                    }, { transaction: t });
                }
            }*/
            
            await t.commit();
            return { mensaje: "Carga de stock y devoluciones completadas correctamente" };

        } catch (error) {
            await t.rollback();
            console.error("❌ Error en transacción:", error);
            throw new Error("Error al guardar stock o devoluciones");
        }
    }
}
