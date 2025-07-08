import {ICaja}  from "../../interface/Caja/Caja.interface";
import {CajaRepository} from "../../repository/Caja/Caja.repository";

export const CajaService = {
    getAll: async () => {
        return await CajaRepository.getAll();
    },

    getByIDFlexible: async (id_caja: string) => {
        return await CajaRepository.getByIDFlexible(id_caja);
    },

    getCantidadCajasPorSucursal: async (id_empre: string) => {
        return await CajaRepository.getCantidadCajasPorSucursal(id_empre);
    },

    createCaja: async (data: ICaja) => {
        return await CajaRepository.createCaja(data);
    },

    updateCaja: async (id_caja: string, data: ICaja) => {
        return await CajaRepository.updateCaja(id_caja, data);
    },
}