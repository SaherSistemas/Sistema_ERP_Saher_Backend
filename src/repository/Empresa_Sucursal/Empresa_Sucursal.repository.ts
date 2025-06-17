import { ICrearEmpresaSucursal, IEmpresaSucursal, IUpdateEmpresaSucursal } from "../../interface/Empresa_Sucursal/Empresa_Sucursal.interface";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import { v4 as uuidv4 } from 'uuid';
import Colonia from "../../models/Ubicacion/Colonia";
import Ciudad from "../../models/Ubicacion/Ciudad";
import Estado from "../../models/Ubicacion/Estado";
import Pais from "../../models/Ubicacion/Pais";
export const Empresa_SucursalRepository = {
    getAll: async (): Promise<IEmpresaSucursal[]> => {
        return await Empresa_Sucursal.findAll({
            include: [
                {
                    model: Colonia,
                    attributes: ['id_colonia', 'nom_colonia'],
                }
            ]
        });
    },
    getByID: async (id: string): Promise<IEmpresaSucursal | null> => {
        return await Empresa_Sucursal.findByPk(id, {
            include: [
                {
                    model: Colonia,
                    attributes: ['id_colonia', 'nom_colonia'],
                    include: [
                        {
                            model: Ciudad,
                            attributes: ['id_ciuda', 'nom_ciuda'],
                            include: [
                                {
                                    model: Estado,
                                    attributes: ['id_esta', 'nom_esta'],
                                    include: [{
                                        model: Pais,
                                        attributes: ['id_pais', 'nom_pais']
                                    }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    },
    crearNuevaSucursalEmpresa: async (data: ICrearEmpresaSucursal) => {

        const nuevoUUID = uuidv4();
        return await Empresa_Sucursal.create({
            id_empre: nuevoUUID,
            ...data
        })
    },
    updatedSucursal: async (id_empresaSucursal: string, data: IUpdateEmpresaSucursal) => {
        const empresa = await Empresa_Sucursal.findByPk(id_empresaSucursal);
        if (!empresa) return null
        return await empresa.update(data)
    },
    statusActualEmpresa: async (id: string) => {
        const empresa = await Empresa_Sucursal.findByPk(id)
        if (!empresa) return null;
        return empresa.status_empre
    },
    cambiarStatus: async (id: string, statusContrario: boolean) => {
        const empresa = await Empresa_Sucursal.findByPk(id)
        console.log(empresa)
        console.log(statusContrario)
        if (!empresa) return null;
        return await empresa.update({ status_empre: statusContrario })
    }

}