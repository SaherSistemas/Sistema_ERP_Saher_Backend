import { ICrearUbicacionSucursal } from "../interface/Ubicacion_Sucursal.interface";
import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";
import { v4 as uuidv4 } from 'uuid';

export const Ubicacion_SucursalRepository = {
    getAll: async () => {
        return await Ubicacion_Sucursal.findAll();
    },
    findByID: async (id: string) => {
        return await Ubicacion_Sucursal.findByPk(id);
    },
    createUbicacionSucursal: async (data: ICrearUbicacionSucursal) => {

        return await Ubicacion_Sucursal.create({
            id_ubicacion_sucursal_articulo: uuidv4(), // UUID se genera automáticamente
            ...data
        });
    },
    findAllUbicacionesBySucursal: async (id_sucursal: string) => {
        return await Ubicacion_Sucursal.findAll({
            where: {
                id_empresa_sucursal: id_sucursal
            }
        });
    },
    existsByLayout: async (
        id_empresa_sucursal: string,
        tarima_ub?: string | null,
        pasillo_ub?: string | null,
        anaquel_ub?: string | null,
        nivel_ub?: string | null,
        posicion_ub?: string | null,
    ): Promise<boolean> => {

        const where: any = { id_empresa_sucursal };

        const tar = (tarima_ub ?? "").trim();
        const esTarima = tar.length > 0;

        if (esTarima) {

            where.tarima_ub = tar;
        } else {

            where.pasillo_ub = (pasillo_ub ?? "").trim();
            where.anaquel_ub = (anaquel_ub ?? "").trim();
            where.nivel_ub = (nivel_ub ?? "").trim();
            where.posicion_ub = (posicion_ub ?? "").trim();
        }

        const count = await Ubicacion_Sucursal.count({ where });
        return count > 0;
    }

}