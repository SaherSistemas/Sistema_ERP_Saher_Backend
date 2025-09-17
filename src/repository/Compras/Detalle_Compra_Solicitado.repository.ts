import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Articulo from '../../models/Articulos/Articulo';
import Compra_Proveedor from '../../models/Compra/Compra_Proveedor';
import { ICreateOAcumularDetallesSolicitados } from '../../interface/Compras/Detalle_Compra_Solicitado.interface';

export const Detalle_Compra_SolicitadoRepository = {
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
    addDetallesCompraSolicitado: async (data: ICreateOAcumularDetallesSolicitados) => {
        const detallesProcesados = await Promise.all(
            data.detalles.map(async (detalle) => {
                const existente = await Detalle_Compra_Solicitado.findOne({
                    where: {
                        idcompr_detcompsol: data.id_compra,
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
                        idcompr_detcompsol: data.id_compra,
                        ...detalle
                    });
                }
            })
        );

        return detallesProcesados;
    },


}