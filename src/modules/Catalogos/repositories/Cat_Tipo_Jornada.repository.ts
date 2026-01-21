import Cat_Tipo_Jornada from '../model/Cat_Tipo_Jornada';
import { ICat_Tipo_Jornada, IUpdateCat_Tipo_Jornada } from '../interface/Cat_Tipo_Jornada.interface';

export const Cat_Tipo_JornadaRepository = {
    getAll: async (): Promise<ICat_Tipo_Jornada[]> => await Cat_Tipo_Jornada.findAll(),

    getById: async (id: string) => await Cat_Tipo_Jornada.findByPk(id),

    create: async (data: ICat_Tipo_Jornada) => await Cat_Tipo_Jornada.create({ ...data }),

    update: async (id: string, data: IUpdateCat_Tipo_Jornada) => {
        const record = await Cat_Tipo_Jornada.findByPk(id);
        if (!record) return null;
        return await record.update(data);
    }
};
