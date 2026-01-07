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
        tarima_ub: string,
        pasillo_ub: string,
        anaquel_ub: string,
        nivel_ub: string,
        posicion_ub: string
    ): Promise<boolean> => {
        const count = await Ubicacion_Sucursal.count({
            where: {
                id_empresa_sucursal,
                tarima_ub,
                pasillo_ub,
                anaquel_ub,
                nivel_ub,
                posicion_ub
            }
        });

        return count > 0;
    }

}