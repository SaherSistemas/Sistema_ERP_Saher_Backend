import { Op } from "sequelize";
import Recepcion_Entrada from "../model/Recepcion_Entrada";
import { IListRecepcionesQuery } from "../interface/Recepcion_Entrada.interface";
import Empleado from "../../../RRHH/model/Empleado";


export const Recepcion_EntradaRepository = {
    create: async (data: Partial<Recepcion_Entrada>) => {
        return await Recepcion_Entrada.create(data as any);
    },

    findById: async (id_recepcion: string) => {
        return await Recepcion_Entrada.findByPk(id_recepcion, {
            include: [{ model: Empleado, attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"] }],
        });
    },

    list: async (query: IListRecepcionesQuery, id_empresa: string) => {
        const search = (query.search ?? "").trim();
        const limit = Math.min(Number(query.limit ?? 20), 200);
        const offset = Math.max(Number(query.offset ?? 0), 0);

        const where: any = { id_empresa };

        if (search) {
            where[Op.or] = [
                { entidad_recibo: { [Op.iLike]: `%${search}%` } },
                { nombre_persona_entrega: { [Op.iLike]: `%${search}%` } },
                { tipo_entidad: { [Op.iLike]: `%${search}%` } },
            ];
        }

        if (query.tipo_entidad) {
            where.tipo_entidad = query.tipo_entidad;
        }

        if (query.fecha_desde || query.fecha_hasta) {
            where.fecha_recepcion = {};
            if (query.fecha_desde) {
                where.fecha_recepcion[Op.gte] = new Date(query.fecha_desde + "T00:00:00");
            }
            if (query.fecha_hasta) {
                where.fecha_recepcion[Op.lte] = new Date(query.fecha_hasta + "T23:59:59");
            }
        }

        const { rows, count } = await Recepcion_Entrada.findAndCountAll({
            where,
            include: [{ model: Empleado, attributes: ["nombre_empleado", "ap_pat_empleado", "ap_mat_empleado"] }],
            order: [["fecha_recepcion", "DESC"]],
            limit,
            offset,
        });

        return { rows, count, limit, offset };
    },
};
