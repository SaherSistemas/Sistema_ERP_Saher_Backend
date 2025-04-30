import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";
import { Empresa_SucursalRepository } from "../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { CiudadRepository } from "../../repository/Lugares/Ciudad.repository";
import { isUUID } from "../../utils/validaciones";

export const Empresa_SucursalService = {
    getAllEmpresas: async (): Promise<IEmpresaSucursal[]> => {
        return await Empresa_SucursalRepository.getAll();
    },
    createEmpresaSucursal: async (data: ICrearEmpresaSucursal) => {
        if (
            !data ||
            typeof data.nom_empre !== 'string' || !data.nom_empre.trim() ||
            typeof data.rfc_empre !== 'string' || !data.rfc_empre.trim() ||
            typeof data.tipo_empre !== 'string' || !['M', 'S'].includes(data.tipo_empre) ||
            typeof data.cp_empre !== 'string' || !data.cp_empre.trim() ||
            typeof data.calle_empre !== 'string' || !data.calle_empre.trim() ||
            (
                typeof data.id_ciudad_empre !== 'string' && typeof data.id_ciudad_empre !== 'number'
            ) ||
            (
                typeof data.id_ciudad_empre === 'string' && !data.id_ciudad_empre.trim()
            ) ||
            typeof data.correo_empre !== 'string' || !data.correo_empre.trim() ||
            typeof data.tele_empre !== 'string' || !data.tele_empre.trim()
        ) {
            throw new Error("Datos inválidos");
        }

        if (!isUUID(data.id_ciudad_empre) && !isNaN(Number(data.id_ciudad_empre))) {
            const ciudad = await CiudadRepository.findByIdFlexible(data.id_ciudad_empre)
            if (!ciudad) throw new Error("La ciudad proporcionada no existe");
            data.id_ciudad_empre = ciudad.id_ciuda
        }
        return await Empresa_SucursalRepository.crearNuevaSucursalEmpresa(data);
    },
    getEmpresaSucursalByID: async (id: string) => {
        const empresaSucursal = await Empresa_SucursalRepository.getByID(id);
        if (!empresaSucursal) throw new Error("Empresa no encontrada.")
        return empresaSucursal
    },
    updateEmpresaSucursal: async (id: string, data: IUpdateEmpresaSucursal) => {
        if (data.id_ciudad_empre) {
            if (!isUUID(data.id_ciudad_empre) && !isNaN(Number(data.id_ciudad_empre))) {
                const estado = await CiudadRepository.findByIdFlexible(data.id_ciudad_empre)
                if (!estado) throw new Error("La ciudad proporcionada no existe.")
                data.id_ciudad_empre = estado.id_ciuda
            }
        }
        return await Empresa_SucursalRepository.updatedSucursal(id, data)
    },
    cambiarStatus: async (id: string) => {
        const statusActual = await Empresa_SucursalRepository.statusActualEmpresa(id);
        if (statusActual === null) throw new Error("Empresa no encontrada");
        const nuevoStatus = !statusActual;
        const updateStatusEmpresa = await Empresa_SucursalRepository.cambiarStatus(id, nuevoStatus);
        if (!updateStatusEmpresa) throw new Error("No se pudo actualizar es estado de la empresa.");

        return updateStatusEmpresa
    }
}