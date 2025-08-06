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
    getEmpresasPorGrupo: async (id_grup_empre: string) => {
        const empresas = await Empresa_Sucursal.findAll({
            attributes: ["id_empre"], // Solo traigo el ID
            where: {
                idgrup_empre: id_grup_empre
            },
            raw: true // Para que devuelva objetos planos
        });

        // Devuelvo solo un array de IDs
        return empresas.map(e => e.id_empre);
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
    getGrupo: async (id_empresa: string) => {
        return await Empresa_Sucursal.findOne({
            where: {
                id_empre: id_empresa
            },
            attributes: ['idgrup_empre'],
            raw: true
        })
    },
    getByIDHeader: async (id: string): Promise<IEmpresaSucursal | null> => {
        return await Empresa_Sucursal.findByPk(id, {
            attributes: ['id_empre', 'nom_empre']
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
        if (!empresa) return null;
        return await empresa.update({ status_empre: statusContrario })
    }

}