import { ICat_Regimen_Fiscal, IUpdateCat_Regimen_Fiscal } from "../interface/Cat_Regimen_Fiscal.interface";
import Cat_Regimen_Fiscal from "../model/Cat_Regimen_Fiscal";

export const Cat_Regimen_FiscalRepository = {
    getAll: async (): Promise<ICat_Regimen_Fiscal[]> => {
        return await Cat_Regimen_Fiscal.findAll();
    },
    getById: async (id: string) => {
        return await Cat_Regimen_Fiscal.findByPk(id)
    },
    update: async (id: string, data: IUpdateCat_Regimen_Fiscal) => {
        const regimenFiscal = await Cat_Regimen_Fiscal.findByPk(id)
        if (!regimenFiscal) return null;
        return await regimenFiscal.update(data)
    },
    create: async (data: ICat_Regimen_Fiscal) => {
        return await Cat_Regimen_Fiscal.create({
            ...data
        })
    }
}   