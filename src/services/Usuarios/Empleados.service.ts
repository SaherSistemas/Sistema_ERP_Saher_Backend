import { IEmpleado, ICrearEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { EmpleadoRepository, } from "../../repository/Usuarios/Empleado.repository";
import { v4 as uuidv4 } from 'uuid'

export const EmpleadoService = {
    getAllEmpleados: async (): Promise<IEmpleado[]> => {
        return await EmpleadoRepository.getAll();
    },
    getEmpledoById: async (id: string | number): Promise<IEmpleado> => {
        return await EmpleadoRepository.getById(id)
    },
    createEmpleado: async (data: ICrearEmpleado) => {
        const ultimoId = await EmpleadoRepository.ultimoId();
        const nuevoID = ultimoId ? ultimoId.idinterno_empleado + 1 : 1
        console.log(nuevoID)
        //GENERAR UIID DEL LISTADO
        const uuid_empleado = uuidv4();
        return await EmpleadoRepository.crearEmpleadoNuevo({ ...data }, nuevoID, uuid_empleado)
    }

}