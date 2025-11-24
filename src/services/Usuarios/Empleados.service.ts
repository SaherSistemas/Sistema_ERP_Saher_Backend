import { IEmpleado, ICrearEmpleado, IUpdateEmpleado } from "../../interface/Usuarios/Empleado.interface";
import { EmpleadoRepository, } from "../../repository/Usuarios/Empleado.repository";
import { v4 as uuidv4 } from 'uuid'
import { isUUID } from "../../utils/validaciones";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";
import { Transaction } from "sequelize";

export const EmpleadoService = {
    getAllEmpleados: async (page: number = 1, limit: number, query: string = '') => {
        return await EmpleadoRepository.getAll(page, limit, query);
    },

    async obtenerEmpleado(id_empleado: string | number, t?: Transaction) {

        if (!id_empleado) {
            throw new Error("id_empleado no enviado en la venta.");
        }

        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado, {
            transaction: t
        });

        if (!empleado) {
            const err = new Error("Empleado no encontrado.");
            (err as any).status = 404;
            throw err;
        }

        return empleado;
    },

    getEmpledoById: async (id: string): Promise<IEmpleado> => {
        const empleado = await EmpleadoRepository.getByIdFlexible(id)
        if (!empleado) throw new Error("Empleado no enocontrado")
        return empleado
    },
    createEmpleado: async (data: ICrearEmpleado) => {

        if (!isUUID(data.id_ciudad_empleado) && !isNaN(Number(data.id_ciudad_empleado))) {
            const ciudad = await CiudadRepository.findByIdFlexible(data.id_ciudad_empleado)
            if (!ciudad) throw new Error("La ciudad proporcionada no existe");
            data.id_ciudad_empleado = ciudad.id_ciuda
        }
        return await EmpleadoRepository.crearEmpleadoNuevo(data)
    },
    updateEmpleado: async (id: string, data: IUpdateEmpleado) => {
        if (data.id_ciudad_empleado) {
            if (!isUUID(data.id_ciudad_empleado) && !isNaN(Number(data.id_ciudad_empleado))) {
                const estado = await CiudadRepository.findByIdFlexible(data.id_ciudad_empleado)
                if (!estado) throw new Error("El estado proporcionado no existe.")
                data.id_ciudad_empleado = estado.id_ciuda
            }
        }

        return await EmpleadoRepository.updateEmpleado(id, data)
    },
    cambiarStatus: async (id: string) => {
        const statusActual = await EmpleadoRepository.statusActualEmpleado(id);
        if (statusActual === null) throw new Error("Empleado no encontrado")
        const nuevoStatus = !statusActual;
        const updateStatusEmpleado = await EmpleadoRepository.cambiarStatus(id, nuevoStatus);
        if (!updateStatusEmpleado) throw new Error('No se pudo actualziar el estatus del empleado');

        return updateStatusEmpleado;
    }

}