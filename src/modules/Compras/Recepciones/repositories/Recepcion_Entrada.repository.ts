import { Op } from "sequelize";
import Recepcion_Entrada from "../model/Recepcion_Entrada";
import { IListRecepcionesQuery } from "../interface/Recepcion_Entrada.interface";

export const Recepcion_EntradaRepository = {
    create: async (data: Partial<Recepcion_Entrada>) => {
        return await Recepcion_Entrada.create(data as any);
    },

    findById: async (id_recepcion: string, withFirma: boolean) => {
        return await Recepcion_Entrada.findByPk(id_recepcion, {
            attributes: withFirma
                ? undefined
                : { exclude: ["firma_png"] },
        });
    },

    list: async (query: IListRecepcionesQuery) => {
        const search = (query.search ?? "").trim();
        const limit = Math.min(Number(query.limit ?? 20), 100);
        const offset = Math.max(Number(query.offset ?? 0), 0);

        const where: any = {};
        if (search) {
            where[Op.or] = [
                { entidad_recibo: { [Op.iLike]: `%${search}%` } },
                { nombre_persona_entrega: { [Op.iLike]: `%${search}%` } },
                { tipo_entidad: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const { rows, count } = await Recepcion_Entrada.findAndCountAll({
            where,
            attributes: { exclude: ["firma_png"] },
            order: [["fecha_recepcion", "DESC"]],
            limit,
            offset,
        });

        return { rows, count, limit, offset };
    },
};
