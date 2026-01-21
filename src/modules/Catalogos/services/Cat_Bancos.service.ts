import { Cat_BancosRepository } from '../repositories/Cat_Bancos.repository';
import { ICat_Bancos, IUpdateCat_Bancos } from '../interface/Cat_Bancos.interface';
export const Cat_BancoService = {
    getAll: async (): Promise<ICat_Bancos[]> => await Cat_BancosRepository.getAll(),

    getById: async (id: string) => {
        const result = await Cat_BancosRepository.getById(id);
        if (!result) throw new Error("Banco no encontrado");
        return result;
    },

    create: async (data: ICat_Bancos) => {
        if (!data.id_banco?.trim() || !data.descrip_banco?.trim()) {
            throw new Error("Datos inválidos");
        }
        return await Cat_BancosRepository.create(data);
    },

    update: async (id: string, data: IUpdateCat_Bancos) => {
        const result = await Cat_BancosRepository.update(id, data);
        if (!result) throw new Error("No se pudo actualizar");
        return result;
    }
};
