import { ArticuloRepository } from "../../../Catalogos/Articulos/repositories/Articulo.repository";
import { Articulo_Ubicacion_DefaultRepository } from "../repositories/Articulo_Ubicacion_Default.repository";



export const Articulo_Ubicacion_DefaultServices = {

    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {

        return await Articulo_Ubicacion_DefaultRepository.getByIDArticulo(id_empresa_sucursal, id_articulo);
    }
};