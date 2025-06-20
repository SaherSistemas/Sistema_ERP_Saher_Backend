import { ICreateCompra_Proveedor, ICreateCompraProveedorYDetalleCompraSolicitado } from "../../interface/Compras/Compra_Proveedor.interface"
import Compra_Proveedor from "../../models/Compra/Compra_Proveedor"
import { v4 as uuidv4 } from 'uuid';
import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Compra_General from "../../models/Compra/Compra_General";
import { ICompra_General, ICreateCompra_General } from "../../interface/Compras/Compra_General.interface";
import Proveedor from "../../models/Proveedor/Proveedor";
import Articulo from "../../models/Articulos/Articulo";
/*
       Código	      Estado	                             Descripción
       C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
       A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
       E	        ENVIADA	                                 La orden ha sido enviada al proveedor.
       L            CAPTURANDO LOTES                         La compra se estan capturando los lotes.
       R	        RECIBIDA	                             Todos los productos han sido recibidos correctamente.(ESPERANDO CHEQUEO Y CONTEO)
       F	        COMPLETADA	                             Fue recibido y se cerró la compra.
       D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
*/


export const CompraRepository = {
    getAllCompra_General: async (id_empresa: string) => {
        return await Compra_General.findAll({
            where: { id_empresa_sucursal: id_empresa },
        });
    },
    getCompraEnCaptura: async (id_empresa: string) => {
        return await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresa,
                estado_comp: 'C'
            }
        })
    },

    createCompra_General: async (data: ICreateCompra_General) => {
        const { fecha_inicio, id_empre, ultimo_articulo_guardado } = data

        return await Compra_General.create({
            id_compra_general: uuidv4(),
            estado_comp: 'C',
            fecha_inicio,
            id_empresa_sucursal: id_empre,
            ultimo_articulo_guardado
        })
    },

    findByPK_Compra_General: async (id_compra_general: string) => {
        return await Compra_General.findByPk(id_compra_general)
    },
    compraGeneralEmpresa: async (id_empresa_sucursal: string) => {
        const compra = await CompraRepository.getCompraEnCaptura(id_empresa_sucursal)
        return compra
    },
    actualizarEstadoCompras: async (id_empresa_sucursal: string) => {
        const compra = await CompraRepository.compraGeneralEmpresa(id_empresa_sucursal)
        // Obtener las compras por proveedor relacionadas
        const comprasProveedor = await Compra_Proveedor.findAll({
            where: { id_compra_general: compra.id_compra_general }
        });
        for (const compprov of comprasProveedor) {
            await compprov.update({
                estado_comp: 'A',
            });
        }

        await compra.update({
            estado_comp: 'A',
            fecha_fin: new Date()
        });
        return compra
    },






    /*
     * ************************************************************
     * ************************cOMPRA_PROVEEDOR*******************
     * ***********************************************************
     */

    getAllCompra_ProveedorPorIdCompGener: async (id_compra_general: string) => {
        return await Compra_Proveedor.findAll({
            where: { id_compra_general: id_compra_general },
            include: [
                {
                    model: Proveedor
                }
            ]
        });
    },

    createCompraProveedor: async (data: ICreateCompra_Proveedor) => {
        const { idprove_comp, id_compra_general } = data
        return await Compra_Proveedor.create({
            id_comp: uuidv4(),
            estado_comp: 'C',
            idprove_comp: idprove_comp,
            id_compra_general: id_compra_general,
            inicio_de_compra_proveedor: new Date(),
        })
    },
    actualizarArticuloGuardadoUltimo: async (id_compra_general: string, id_artic: string) => {

        const compraGeneral = await Compra_General.findByPk(id_compra_general)

        return await compraGeneral.update({
            ultimo_articulo_guardado: id_artic
        })
    },

    findCompraProveedor_CapturandoByProveedor: async (id_proveedor: string, id_empresa: string) => {
        return await Compra_Proveedor.findOne({
            where: {
                idprove_comp: id_proveedor,
                estado_comp: 'C' // o el que uses para 'Capturando'
            },
            include: [
                {
                    model: Compra_General,
                    where: {
                        id_empresa_sucursal: id_empresa
                    }
                }
            ]
        });
    },



















    addDetallesCompraSolicitado: async (id_compra: string, detalles: any[]) => {
        const detallesProcesados = await Promise.all(
            detalles.map(async (detalle) => {
                const existente = await Detalle_Compra_Solicitado.findOne({
                    where: {
                        idcompr_detcompsol: id_compra,
                        idarticulo_detcompsol: detalle.idarticulo_detcompsol,
                        precio_detcompsol: detalle.precio_detcompsol
                    }
                });

                if (existente) {
                    // Acumular la cantidad si ya existe
                    existente.cantidad_detcompsol += detalle.cantidad_detcompsol;
                    await existente.save();
                    return existente;
                } else {
                    // Crear nuevo si no existe
                    return await Detalle_Compra_Solicitado.create({
                        id_detcompsol: uuidv4(),
                        idcompr_detcompsol: id_compra,
                        ...detalle
                    });
                }
            })
        );

        return detallesProcesados;
    },










    articulosDetalleCompraProveedor: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findOne({
            where: { id_comp },
            attributes: ['id_comp'],
            include: [
                {
                    model: Detalle_Compra_Solicitado,
                    attributes: ['cantidad_detcompsol', 'precio_detcompsol'],
                    include: [
                        {
                            model: Articulo,
                            attributes: ['cod_int_artic', 'cod_barr_artic', 'des_artic'],
                        }
                    ],
                    required: false // evita LEFT JOIN innecesarios si no hay productos
                },
                {
                    model: Proveedor,
                    attributes: ['nomcort_prove', 'razsoc_prove', 'rfc_prove', 'telef_prove', 'corr_prove'],
                    required: false
                }
            ],
        });

        return compraProveedor.get({ plain: true })
    }

}