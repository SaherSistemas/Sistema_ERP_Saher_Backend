import { ICreateOrUpdateStockSucursal, IDataProductosStock, IStockSucursal } from "../../interface/Stock/Stock_Sucursal.interface";
import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
import { Grupo_Empresa_Lista_PrecioRepository } from "../../repository/Costo_Y_Precio/Grupo_Empresa_Lista_Precio.repository";
import { DetalleListaPreciosRepository } from "../../repository/Costo_Y_Precio/Lista_Precio/Detalle_Lista_Precio.repository";
import { Margen_Ganancia_ListaRepository } from "../../repository/Costo_Y_Precio/Margen_Ganancia_Lista.repository";
import { Empresa_SucursalRepository } from "../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { Grupo_EmpresaRepository } from "../../repository/Empresa_Sucursal/Grupo_Empresa.repository";
import { LotesArticuloSucursalRepository } from "../../repository/LotesYCaducidad/Lote_ArticuloSucursal.repository";
import { StockSucursalRepository } from "../../repository/Stock/Stock_Sucursal.repository";

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

    //ESTE METODO SE USARA PARA LOS CABOS Y PARA CULIACAN 
    create: async (data: { id_empresa: string; productosEntrada: ICreateOrUpdateStockSucursal[] }) => {
        const { id_empresa, productosEntrada } = data;

        if (!productosEntrada || productosEntrada.length === 0) {
            return { mensaje: "No se recibieron productos" };
        }

        // 🟢 1. Obtener grupo de empresa una sola vez
        const grupoEmpresa = await Empresa_SucursalRepository.getGrupo(id_empresa);
        if (!grupoEmpresa) {
            throw new Error(`No se encontró grupo para la empresa ${id_empresa}`);
        }

        //OBTENER EMPRESAS EN EL GRUPO PARA SACAR EL COSTO GENERAL DEL PRODUCTO MAS ADELANTE 
        const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(grupoEmpresa.idgrup_empre)

        // 🟢 2. Obtener listas de precio del grupo una sola vez
        const listasDePrecioGrupo = await Grupo_Empresa_Lista_PrecioRepository.getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
        const idsListasGrupo = listasDePrecioGrupo.map(l => l.id_list_precio);
        // 🟢 3. Recorrer los productos
        for (const producto of productosEntrada) {
            const modeloArticulo = await ArticuloRepository.getByPK(producto.id_artic)

            //PARA EL COSTO 
            const { costoPromedio, totalCantidad } =
                await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(
                    producto.id_artic,
                    empresas // este ya es el array de ids_empre que obtuviste antes
                );
            const costoNuevo = parseFloat(producto.precio); //CSOTO QUE TRAE EL PRODUCTO EN ESTA NUEVA COMPRA 
            const cantidadNueva = producto.lotes.reduce(
                (total, lote) => total + Number(lote.cantidad_lote || 0),
                0
            );
            const costoPromedioActualizado =
                (costoPromedio * totalCantidad + costoNuevo * cantidadNueva) /
                (totalCantidad + cantidadNueva);

            console.log(costoPromedioActualizado)


            for (const lote of producto.lotes) {
                await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal({
                    id_artic: producto.id_artic,
                    id_empre: id_empresa,
                    numero_lote_sucursal: lote.numerolote_lote,
                    fecha_venci_lote_sucursal: new Date(lote.fechavencimiento_lote),
                    cantidad_lote_sucursal: lote.cantidad_lote,
                    precio_costo_lote_sucursal: costoNuevo,
                    estado_lote_sucursal: 'A' // o el estado correspondiente
                });
            }

            await StockSucursalRepository.updateCantidadExistencia(id_empresa, producto.id_artic);
            //FALTA VERIFICAR SI HAY UN MARGEN ESPECIAL PARA EL PRODUCTO EN ESPECIFICO VIGENTE 
            const margenGananciaTodasLasListas = await Margen_Ganancia_ListaRepository.getByProducto(modeloArticulo.id_categoria, modeloArticulo.id_presentacion)

            const margenesFiltrados = margenGananciaTodasLasListas.filter(
                margen => idsListasGrupo.includes(margen.id_lista_precio)
            );

            for (const margen of margenesFiltrados) {
                const margenNum = margen.margen
                const precioPorLista = costoPromedioActualizado / (1 - (margenNum / 100));

                console.log(`📌 Lista: ${margen.lista_precio.nombre_lista_precio}`);
                console.log(`   Margen: ${margenNum}%`);
                console.log(`   Precio final: ${precioPorLista.toFixed(2)}`);

                await DetalleListaPreciosRepository.updateOrCreate({
                    id_lista_precio: margen.lista_precio.id_lista_precio,
                    id_artic: producto.id_artic,
                    precios: precioPorLista
                })
            }
            // Aquí puedes obtener el artículo de la BD
            // const obtenerArticulo = await ArticuloRepository.getByPK(producto.id_artic);
            // const precioArticulo = producto.precio ?? obtenerArticulo.precio_base;

            // Aquí insertas en stock sucursal
            // await StockSucursalRepository.create({ ...producto, id_empresa, precio: precioArticulo });

            // Aquí actualizas listas de precio si aplica
            // for (const lista of listasDePrecioGrupo) {
            //     await ListaPrecioRepository.updatePrecio(lista.id_lista, producto.id_artic, precioArticulo);
            // }
        }

        //return { mensaje: "Carga de stock completada correctamente" };
    }
}
