import { v4 as uuidv4 } from 'uuid';
import LotesRecibidosCompra from '../../models/LotesYCaducidad/LotesRecibidosCompra';

export const LotesRecibidosCompraRepository = {
    getAllLotes: async (id_empresa_sucursal: string, id_artic: string) => {
        return await LotesRecibidosCompra.findAll({
            where: { id_parametro_comp: id_artic },
        });
    }

}