import { ICreateCompra_General } from "../../interface/Compras/Compra_General.interface";
import { ICreateCompraProveedorYDetalleCompraSolicitado } from "../../interface/Compras/Compra_Proveedor.interface";
import { IDetalle_Compra_Solicitado } from "../../interface/Compras/Detalle_Compra_Solicitado.interface";
import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
import { CompraRepository } from "../../repository/Compras/Compra.repository";
import { Listado_ProveedorRepository } from "../../repository/Proveedor/Listado_Proveedor.repository";


export const CompraService = {
    getAll: async (id_empresa: string) => {
        return await CompraRepository.getAllCompra_General(id_empresa);
    },
    createCompra: async (data: ICreateCompraProveedorYDetalleCompraSolicitado) => {
        const { id_empresa, id_listproveedor, detalle } = data

        const listado = await Listado_ProveedorRepository.getByID(id_listproveedor)

        const id_proveedor = listado.id_prove_listprove;

        //BUSCAR O CREAR COMPRA GENERAL EN EL ESTAOD "C"

        const articulo = await ArticuloRepository.getByIDFlexible(detalle.id_articulo_detcompsol)
        const uuidArticulo = articulo.id_artic;

        let compraGeneral = await CompraRepository.getAllCompra_General(id_empresa)
        let compraGeneralActiva = compraGeneral.find(cg => cg.estado_comp === 'C')
        console.log("GENERAL: ", compraGeneral)
        console.log("GENERAL ACTIVA: ", compraGeneralActiva)
        if (!compraGeneralActiva) {
            compraGeneralActiva = await CompraRepository.createCompra_General({
                fecha_inicio: new Date(),
                id_empre: id_empresa,
                estado_comp: 'C',
                ultimo_articulo_guardado: uuidArticulo
            })
        }

        // buscar o crear compra proveedor 
        let compraProveedor = await CompraRepository.findCompraProveedor_CapturandoByProveedor(id_proveedor, id_empresa)

        if (!compraProveedor) {
            compraProveedor = await CompraRepository.createCompraProveedor({
                idprove_comp: id_proveedor,
                id_compra_general: compraGeneralActiva.id_compra_general
            })
        }

        //Agregar o Acumular el detalle

        const Detalles = await CompraRepository.addDetallesCompraSolicitado(
            compraProveedor.id_comp,
            [
                {
                    idarticulo_detcompsol: uuidArticulo,
                    cantidad_detcompsol: detalle.cantidad_detcompsol,
                    precio_detcompsol: detalle.precio_detcompsol
                }
            ]
        );

        return {
            compra_general: compraGeneralActiva,
            compra_proveedor: compraProveedor,
            detalle_agregado: Detalles
        }

    },


}