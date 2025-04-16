import { IEmpleado } from "../../interface/Usuarios/Empleado.interface";
import Empleado from "../../models/Usuarios/Empleado";

export const EmpleadoRepository = {
    getAll: async (): Promise<IEmpleado[]> => {
        return Empleado.findAll();
    },
    ultimoId: async () => {
        return await Empleado.findOne({
            order: [["numcontint_empleado", "DESC"]]
        })
    },
    crearEmpleadoNuevo: async (data: IEmpleado, numcontint_empleado: number) => {
        return await Empleado.create({
            numcontint_empleado: numcontint_empleado,
            ...data
        })
    }
}