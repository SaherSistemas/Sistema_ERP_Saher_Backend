import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Articulo from '../../models/Articulos/Articulo';
import Compra_Proveedor from '../../models/Compra/Compra_Proveedor';
import Proveedor from '../../models/Proveedor/Proveedor';

export const Compra_ProveedorRepository = {
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_Solicitado.findAll({
            where: { idcompr_detcompsol: id_comp },
            include: [
                {
                    model: Articulo
                },
                {
                    model: Compra_Proveedor
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

    actualizarFechaEnviadaProveedor: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findByPk(id_comp);

        if (!compraProveedor) {
            throw new Error('Compra del proveedor no encontrada');
        }

        if (compraProveedor.fecha_enviada_proveedor == null) {
            return await compraProveedor.update({
                fecha_enviada_proveedor: new Date(),
                estado_comp: 'E'
            });
        }

        // Si ya tenía fecha, simplemente retorna el objeto sin modificar
        return compraProveedor;
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