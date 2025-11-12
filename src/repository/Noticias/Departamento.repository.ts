import { IDepartamentoCreate } from "../../interface/Noticias/Departamento.interface";
import Departamento from "../../models/Noticias/Departamento";
import { Transaction } from "sequelize";

export const DepartamentoRepository = {
    getAll: async () => {
        return await Departamento.findAll({
            order: [["nom_departamento", "ASC"]],
        });
    },

    getById: async (id_departamento: number) => {
        return await Departamento.findByPk(id_departamento);
    },

    create: async (data: IDepartamentoCreate, options?: { transaction?: Transaction }) => {
        return await Departamento.create({ ...data }, { transaction: options?.transaction });
    },

    update: async (id_departamento: number, data: Partial<IDepartamentoCreate>) => {
        return await Departamento.update(data, { where: { id_departamento } });
    }
};
