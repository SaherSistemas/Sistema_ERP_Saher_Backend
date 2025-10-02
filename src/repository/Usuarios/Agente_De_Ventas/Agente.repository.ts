import { v4 as uuidv4 } from 'uuid';
import { ICreateAgente } from "../../../interface/Usuarios/Agente_De_Ventas/Agente.interface";
import Agente_de_Venta from "../../../models/Usuarios/Agente_De_Ventas/Agente_De_Venta"
import id from 'zod/v4/locales/id.js';

export const AgenteRepository = {
    getAll: async () => {
        return await Agente_de_Venta.findAll();
    },
    getByID: async (id_agente: string) => {
        return await Agente_de_Venta.findByPk(id_agente);
    },
    createAgente: async (data: ICreateAgente) => {
        const nuevoUUID = uuidv4();
        return await Agente_de_Venta.create({
            id_agente: nuevoUUID,
            ...data
        })
    },
    updateAgente: async (id_agente: string, data: ICreateAgente) => {
        return await Agente_de_Venta.update(data, {
            where: {
                id_agente: id_agente
            }
        });
    }
}