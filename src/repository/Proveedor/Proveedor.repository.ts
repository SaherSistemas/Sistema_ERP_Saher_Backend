
import { ICreateProveedor, IProveedor, IProveedorUpdateBody } from "../../interface/Proveedor/Proveedor.interface";
import Proveedor from "../../models/Proveedor/Proveedor";
import { v4 as uuidv4 } from 'uuid';
import Colonia from "../../models/Ubicacion/Colonia";
import Ciudad from "../../models/Ubicacion/Ciudad";
import Estado from "../../models/Ubicacion/Estado";
import Pais from "../../models/Ubicacion/Pais";
import { Proveedor_EmpresaRepository } from "./Proveedor_Empresa.repository";
import { CompraRepository } from "../Compras/Compra.repository";
import { Compra_ProveedorRepository } from "../Compras/Compra_Proveedor.repository";
export const ProveedorRepository = {
    getAll: async (): Promise<IProveedor[]> => {
        return await Proveedor.findAll();
    },
    getProveedorDeLaCompra: async (id_comp: string) => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp);
        if (!compra) {
            throw new Error("Compra no encontrada");
        }

        return await Proveedor.findOne({ where: { id_prove: compra.idprove_comp } });
    },
    createProveedor: async (data: ICreateProveedor) => {
        const nuevoUUID = uuidv4();

        try {
            return await Proveedor.create({
                id_prove: nuevoUUID,
                ...data
            })
        } catch (error: any) {
            throw error
        }
    },
    findByPK: async (id: string) => {
        return await Proveedor.findByPk(id, {
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
        })
    },
    findByPKNOMBRE: async (id: string) => {
        return await Proveedor.findByPk(id)
    },


    statusActualProveedor: async (id_prove: string) => {
        const proveedor = await ProveedorRepository.findByPK(id_prove);
        if (!proveedor) return null;
        return proveedor.activo_prove;
    },
    cambiarStatus: async (id_prove: string, statusContrario: boolean) => {
        const proveedor = await ProveedorRepository.findByPK(id_prove);
        if (!proveedor) return null;
        return await proveedor.update({ activo_prove: statusContrario })
    },
    updateProveedor: async (id_prove: string, data: IProveedorUpdateBody) => {
        const proveedor = await ProveedorRepository.findByPK(id_prove);
        if (!proveedor) return null;


        // Actualizar proveedor
        await proveedor.update({
            nomcort_prove: data.nomcort_prove,
            razsoc_prove: data.razsoc_prove,
            rfc_prove: data.rfc_prove,
            calle_prove: data.calle_prove,
            diascre_prove: data.diascre_prove,
            limicre_prove: data.limicre_prove,
            telef_prove: data.telef_prove,
            plazoentrega_prove: data.plazoentrega_prove,
            corr_prove: data.corr_prove,
            ctabanca_prove: data.ctabanca_prove,
            condpago_prove: data.condpago_prove,
            id_colonia_prove: data.id_colonia_prove
        });

        // Si viene arreglo de empresas, actualizar relaciones
        if (Array.isArray(data.empresas)) {
            await Proveedor_EmpresaRepository.deleteByProveedor(id_prove);

            const relaciones = await Promise.all(
                data.empresas.map(id_empre =>
                    Proveedor_EmpresaRepository.create({ id_prove, id_empre })
                )
            );

            return relaciones;
        }

        return []; // si no hay empresas, devolvemos vacío
    }

}