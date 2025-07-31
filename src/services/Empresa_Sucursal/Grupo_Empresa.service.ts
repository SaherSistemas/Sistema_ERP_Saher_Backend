import { ICrearGrupoEmpresa, IGrupoEmpresa } from "../../interface/Empresa_Sucursal/Grupo_Empresa.interface";
import { Grupo_EmpresaRepository } from "../../repository/Empresa_Sucursal/Grupo_Empresa.repository";

export const Grupo_EmpresaService = {
    getAllGrupoEmpresa: async () => {
        return await Grupo_EmpresaRepository.getAll();
    },
    createGrupoEmpresa: async (data: ICrearGrupoEmpresa) => {
        return await Grupo_EmpresaRepository.crearNuevoGrupoEmpresa(data);
    },
    getGrupoEmpresaByID: async (id: string) => {
        const grupoEmpresa = await Grupo_EmpresaRepository.getByID(id);
        if (!grupoEmpresa) throw new Error("Grupo no encontrado.")
        return grupoEmpresa
    },
    updateGrupoEmpresa: async (id: string, data: ICrearGrupoEmpresa) => {
        const grupoActualizado = await Grupo_EmpresaRepository.updatedGrupoEmpresa(id, data);
        if (!grupoActualizado) throw new Error("No se pudo actualizar el grupo de empresa.");
        return grupoActualizado;
    },
}