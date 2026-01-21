import { ICat_Regimen_Fiscal, IUpdateCat_Regimen_Fiscal } from "../interface/Cat_Regimen_Fiscal.interface";
import { Cat_Regimen_FiscalRepository } from "../repositories/Cat_Regimen_Fiscal.repository";

export const Cat_Regimen_FiscalService = {
    getAllCat_Regimen_Fiscal: async (): Promise<ICat_Regimen_Fiscal[]> => {
        return await Cat_Regimen_FiscalRepository.getAll();
    },

    createRegimenFiscal: async (data: ICat_Regimen_Fiscal) => {
        if (
            !data ||
            typeof data.id_regimfisc !== 'string' ||
            !data.id_regimfisc.trim() ||
            typeof data.descripcion_regi !== 'string' ||
            !data.descripcion_regi.trim()
        ) {
            throw new Error("Datos Invalidos")
        }

        return await Cat_Regimen_FiscalRepository.create(data)
    },

    getRegimenFiscalByID: async (id: string) => {
        const regimenFiscal = await Cat_Regimen_FiscalRepository.getById(id)
        if (!regimenFiscal) throw new Error("Regimen Fiscal no encontrado")
        return regimenFiscal
    },
    updateRegimenFiscal: async (id: string, data: IUpdateCat_Regimen_Fiscal) => {
        const updateRegimenFiscal = await Cat_Regimen_FiscalRepository.update(id, data)
        if (!updateRegimenFiscal) throw new Error("No se pudo actualizar el Regimen Fiscal.")
        return updateRegimenFiscal
    }
}