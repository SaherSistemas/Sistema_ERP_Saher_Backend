import { ICreateOrUpdateGrupo_Empresa_Lista_Precio, IGrupo_Empresa_Lista_Precio } from "../../interface/Costo_y_Precio/Grupo_Empresa_Lista_Precio.interface";
import { Grupo_Empresa_Lista_PrecioRepository } from "../../repository/Costo_Y_Precio/Grupo_Empresa_Lista_Precio.repository";

export const Grupo_Empresa_Lista_PrecioService = {
    getAll: async () => {
        return await Grupo_Empresa_Lista_PrecioRepository.getAll();
    },
    getListasSinAsignar: async () => {
        return await Grupo_Empresa_Lista_PrecioRepository.getListasSinAsignar();
    },
    getPorGrupo: async (id_grup_empresa: string) => {
        return await Grupo_Empresa_Lista_PrecioRepository.getByIDGrupo(id_grup_empresa)
    },
    delete: async (id_grupo_empresa_lista_precio: string) => {
        return await Grupo_Empresa_Lista_PrecioRepository.delete(id_grupo_empresa_lista_precio);
    },
    create: async (data: ICreateOrUpdateGrupo_Empresa_Lista_Precio) => {
        //  console.log(data)
        const existe = await Grupo_Empresa_Lista_PrecioRepository.getOne(data);
        //  console.log(existe)
        if (existe) {
            throw new Error("Esta lista ya esta asignada a otro grupo de empresas")
        }
        return await Grupo_Empresa_Lista_PrecioRepository.create(data);
    },

    update: async (id_grupo_empresa_lista_precio: string, data: ICreateOrUpdateGrupo_Empresa_Lista_Precio) => {
        return await Grupo_Empresa_Lista_PrecioRepository.update(id_grupo_empresa_lista_precio, data);
    },
}
