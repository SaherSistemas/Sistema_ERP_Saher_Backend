import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";
import { v4 as uuidv4 } from 'uuid';
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
import { Devoluciones_ComprasRepository } from "../../repository/Devoluciones/Devoluciones_Compras.repository";
import { EmpleadoRepository } from "../../repository/Usuarios/Empleado.repository";
import { ICreateDevoluciones_Compra } from "../../interface/Devoluciones/Devoluciones_Compras.interface";
import { Detalle_Compra_RecibidosRepository } from "../../repository/Compras/Detalle_Compra_Recibido.repository";
import { Console } from "console";
import { Detalle_Devoluciones_CompraRepository } from "../../repository/Devoluciones/Detalles_Devoluciones_Compras.repository";
import { Detalle_Compra_NegadosRepository } from "../../repository/Compras/Detalle_Compra_Negado.repository";
import { Compra_ProveedorRepository } from "../../repository/Compras/Compra_Proveedor.repository";
import { LoteRecibidoCompraRepository } from "../../repository/LotesYCaducidad/LoteRecibidoCompra.repository";
import { ILoteRecibidoChecado } from "../../interface/LotesYCaducidad/LotesRecibidosCompra.interface";

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
        const { id_empresa, productosEntrada, productosDevolucion, id_empleado } = data;

        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado)
        //console.log(productosDevolucion)
        if (!productosEntrada || productosEntrada.length === 0) {
            return { mensaje: "No se recibieron productos" };
        }

        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
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

            let subtotalRecibido = 0;
            let ivaRecibido = 0;
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
                    // console.log(producto.lotes)
                    const cantidad = Number(lote.cantidad_lote) || 0;
                    const costoUnitario = parseFloat(producto.precio);
                    subtotalRecibido += cantidad * costoUnitario;
                    ivaRecibido += await ArticuloRepository.getIVAPorArticulo(producto.id_artic, costoUnitario) * cantidad;
                    //console.log(ivaRecibido)
                    //ACTUALIZAR CANTIDAD RECIBIDA 
                    await Detalle_Compra_RecibidosRepository.actualizarCantidadRecibidaReal(lote.id_detallecompr_recibido, lote.cantidad_lote)
                    //ACTUALIZAR LOTE RECIBIIDO TAMBIEN EN LOTES_RECIBIDOS_COMPRA
                    // -----------------AQUI ------------------------
                    const loteRealRecibido: ILoteRecibidoChecado = {
                        id_loterecibido: lote.id_loterecibido,
                        id_detallecompr_recibido: lote.id_detallecompr_recibido,
                        numerolote_lote: lote.numerolote_lote,
                        fechavencimiento_lote: lote.fechavencimiento_lote,
                        cantidad_lote: lote.cantidad_lote,
                        observacion_lote: lote.observacion_lote ?? null,
                        estado_lote: 'O',
                        motivo_ajuste: 'LOTE Y CADUCIDAD CORRECTA',
                    }

                    await LoteRecibidoCompraRepository.update(loteRealRecibido, { transaction: t })
                    // -----------------AQUI ------------------------

                    // console.log("Lote a crear o actualizar:", lote);
                    // Validar datos necesarios
                    if (!lote.numerolote_lote || !lote.fechavencimiento_lote || !lote.cantidad_lote) {
                        throw new Error(`Datos incompletos para el lote: ${JSON.stringify(lote)}`);
                    }

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

            if (Array.isArray(productosDevolucion) && productosDevolucion.length > 0) {
                const dataParaCabezaDevolucion: ICreateDevoluciones_Compra = {
                    id_compr_prove: productosDevolucion[0].id_comp,
                    subtotal: 0,
                    iva_total: 0,
                    id_usuario_devolucio: empleado.id_empleado
                }
                const id_devo = await Devoluciones_ComprasRepository.create(dataParaCabezaDevolucion, { transaction: t })
                //console.log(id_devo)

                const dataParaDevolucion = await Promise.all(
                    productosDevolucion.map(async (d) => {
                        const articuloDevolucion = await Detalle_Compra_RecibidosRepository.getArtuculoRecibido(d.id_detcomprec);

                        const ivaUnitario = await ArticuloRepository.getIVAPorArticulo(
                            articuloDevolucion.idarticulo_detcomprec,
                            Number(d.costo)
                        );
                        // console.log("IVA", ivaUnitario)
                        return {
                            id_devo,
                            id_articulo: articuloDevolucion.idarticulo_detcomprec,
                            cantidad: d.cantidad_devolucion,
                            costo_unitario: Number(d.costo),
                            iva_unitario: ivaUnitario,
                            motivo: d.observacion,
                            lote: d.lote,
                            fecha_caducidad: new Date(d.fecha_caducidad)
                        }
                    })
                )
                // SE CREARON LAS DEVOLUCIOICNES 
                const createDetallesDevolucion = await Detalle_Devoluciones_CompraRepository.create(dataParaDevolucion, { transaction: t })


                //LOS PRODUCTOS QUE SE DEVOLVIERON TAMBIEN TIENE QUE SER NEGADOS PARA QUE SALGA EN LA SIGUITNE COMPRA
                const dataParaNegados = await Promise.all(
                    productosDevolucion.map(async (d) => {
                        const articuloNegado = await Detalle_Compra_RecibidosRepository.getArtuculoRecibido(d.id_detcomprec);
                        return {
                            id_detcompneg: uuidv4(),
                            idcompr_detcompneg: data.id_comp,
                            idarticulo_detcompneg: articuloNegado.idarticulo_detcomprec,
                            cantidad_negada: d.cantidad_devolucion,
                            motivo_negado: d.observacion,
                            recuperado: false,
                            fecha_negado: new Date(),
                            fecha_limite_recuperacion: new Date(new Date().setDate(new Date().getDate() + 10))
                        }
                    })
                )
                //console.log(dataParaNegados)
                const negadoDeDevolucion = await Detalle_Compra_NegadosRepository.agregarProductosNegados(dataParaNegados, { transaction: t });
            }

            const terminarPedido = await Compra_ProveedorRepository.compraProveedorTerminarRecibida(data.id_comp, subtotalRecibido, ivaRecibido, { transaction: t })
            await t.commit();
            return { mensaje: "Carga de stock y devoluciones completadas correctamente" };

        } catch (error) {
            await t.rollback();
            console.error("❌ Error en transacción:", error);
            throw new Error("Error al guardar stock o devoluciones");
        }
    }
}
