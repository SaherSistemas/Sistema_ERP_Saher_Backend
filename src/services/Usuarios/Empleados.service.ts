import { v4 as uuidv4 } from 'uuid';
import { IEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { EmpleadoRepository } from "../../repository/Usuarios/Empleado.repository";

export const EmpleadoService = {
    getAllEmpleados: async (): Promise<IEmpleado[]> => {
        return await EmpleadoRepository.getAll();
    },

    crearEmpleado: async (data: IEmpleado) => {
        //VALIDAR SI ESTAN VACIOS 

        const UltimoId = await EmpleadoRepository.ultimoId()
        const nuevoId = UltimoId ? UltimoId.numcontint_empleado + 1 : 1;

        return await EmpleadoRepository.crearEmpleadoNuevo({ ...data, id_empleado: uuidv4() }, nuevoId)
    }


}