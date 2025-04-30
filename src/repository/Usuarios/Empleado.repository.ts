import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from "../../interface/Usuarios/Empleado.interface";
import Empleado from "../../models/Usuarios/Empleado";
import { isUUID } from "../../utils/validaciones";
import { UniqueConstraintError } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
export const EmpleadoRepository = {
    getAll: async (): Promise<IEmpleado[]> => {
        return Empleado.findAll();
    },
    ultimoId: async () => {
        return await Empleado.findOne({
            order: [["idinterno_empleado", "DESC"]]
        })
    },
    getByIdFlexible: async (id: string): Promise<Empleado | null> => {
        if (isUUID(id)) {
            return await Empleado.findByPk(id)
        } else if (!isNaN(Number(id))) {
            return await Empleado.findOne({ where: { idinterno_empleado: Number(id) } })
        }
        return null
    },
    crearEmpleadoNuevo: async (data: ICrearEmpleado) => {
        const nuevoUUID = uuidv4();
        const ultimoID = await EmpleadoRepository.ultimoId();
        const nuevoID = ultimoID ? ultimoID.idinterno_empleado + 1 : 1;
        try {
            return await Empleado.create({
                id_empleado: nuevoUUID,
                idinterno_empleado: nuevoID,
                ...data
            })
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                throw new Error("Error: algún campo con restricción única ya existe.");
            }
            throw error; // Otro error desconocido
        }
    },
    updateEmpleado: async (id: string, data: IUpdateEmpleado) => {
        const empleado = await EmpleadoRepository.getByIdFlexible(id)
        if (!empleado) return null;
        return await empleado.update(data)
    },
    statusActualEmpleado: async (id: string) => {
        const empleado = await EmpleadoRepository.getByIdFlexible(id);
        if (!empleado) return null;
        return empleado.estatus_empleado
    },
    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const empleado = await EmpleadoRepository.getByIdFlexible(id);
        if (!empleado) return null;
        return await empleado.update({ estatus_empleado: statusContrario })
    }
}