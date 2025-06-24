import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Articulo from '../../models/Articulos/Articulo';

export const Detalle_Compra_SolicitadoRepository = {
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_Solicitado.findAll({
            where: { idcompr_detcompsol: id_comp },
            include: [
                {
                    model: Articulo
                },
            ]
        });
    },


}