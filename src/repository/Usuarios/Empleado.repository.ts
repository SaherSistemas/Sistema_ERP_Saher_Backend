import { ICrearEmpleado, IEmpleado } from "../../interface/Usuarios/Empleado.interface";
import Empleado from "../../models/Usuarios/Empleado";

export const EmpleadoRepository = {
    getAll: async (): Promise<IEmpleado[]> => {
        return Empleado.findAll();
    },
    getById: async (id: string | number) => {
        const isUUID = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(id);

        const whereClause = isUUID
            ? { id_empleado: id }
            : { idinterno_empleado: id };

        const empleado = await Empleado.findOne({ where: whereClause });

        if (!empleado) {
            throw new Error("Empleado no encontrado");
        }

        return empleado;
    },
    ultimoId: async () => {
        return await Empleado.findOne({
            order: [["idinterno_empleado", "DESC"]]
        })
    },
    crearEmpleadoNuevo: async (data: ICrearEmpleado, numcontint_empleado: number, uuid_empleado: string) => {
        return await Empleado.create({
            idinterno_empleado: numcontint_empleado,
            id_empleado: uuid_empleado,
            ...data
        })
    },
}