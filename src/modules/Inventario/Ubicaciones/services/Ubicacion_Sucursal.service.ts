
import e from "cors";
import { ICrearUbicacionSucursal } from "../interface/Ubicacion_Sucursal.interface";
import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";
import { Ubicacion_SucursalRepository } from "../repositories/Ubicacion_Sucursal.repository";

export const Ubicacion_SucursalService = {

    getAll: async () => {
        return await Ubicacion_SucursalRepository.getAll();
    },

    getById: async (id: string) => {
        const ubicacion = await Ubicacion_SucursalRepository.findByID(id);

        if (!ubicacion) {
            throw new Error("Ubicación no encontrada");
        }

        return ubicacion;
    },

    getBySucursal: async (id_sucursal: string) => {
        return await Ubicacion_SucursalRepository.findAllUbicacionesBySucursal(id_sucursal);
    },

    create: async (data: ICrearUbicacionSucursal) => {

        const existe = await Ubicacion_SucursalRepository.existsByLayout(
            data.id_empresa_sucursal,
            data.tarima_ub,
            data.pasillo_ub,
            data.anaquel_ub,
            data.nivel_ub,
            data.posicion_ub
        );

        if (existe) {
            throw new Error("La ubicación ya existe en esta sucursal");
        }


        return await Ubicacion_SucursalRepository.createUbicacionSucursal(data);
    }
};