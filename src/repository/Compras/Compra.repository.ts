import { ICreateCompra_Proveedor, IEsctructuraCompra } from "../../interface/Compras/Compra_Proveedor.interface"
import Compra_Proveedor from "../../models/Compra/Compra_Proveedor"
import { v4 as uuidv4 } from 'uuid';
import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Compra_General from "../../models/Compra/Compra_General";
import { ICreateCompra_General } from "../../interface/Compras/Compra_General.interface";
import Proveedor from "../../models/Proveedor/Proveedor";
import Articulo from "../../models/Articulos/Articulo";
import { Empresa_SucursalRepository } from "../Empresa_Sucursal/Empresa_Sucursal.repository";
/*
       Código	      Estado	                             Descripción
       C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
       A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
       F	        COMPLETADA	                             Fue recibido y se cerró la compra.
       D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
*/


export const CompraRepository = {
    getAllCompra_General: async (id_empresa: string, page: number, limit: number) => {
        const offset = (page - 1) * limit;
        const { count, rows } = await Compra_General.findAndCountAll({
            where: { id_empresa_sucursal: id_empresa },
            order: [['fecha_inicio', 'DESC']],
            limit,
            offset
        });
        return { total: count, compras: rows };
    },
    getCompraEnCaptura: async (id_empresa: string) => {
        return await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresa,
                estado_comp: 'C'
            },
            order: [['fecha_inicio', 'DESC']]
        })
    },

    createCompra_General: async (data: ICreateCompra_General) => {
        const { fecha_inicio, id_empre, ultimo_articulo_guardado, tipo_compra } = data

        const empresa = await Empresa_SucursalRepository.getByID(id_empre)
        const nomCortEmpre = empresa.nom_empre;
        const empresaLimpiada = nomCortEmpre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, '') // elimina acentos
            .replace(/\s+/g, '')            // elimina espacios
            .toUpperCase();

        const fechaFormateada = fecha_inicio.toISOString().slice(0, 10).replace(/-/g, '');
        const idCorto = Math.random().toString(36).substring(2, 8).toUpperCase();

        const identificadorInterno = `${empresaLimpiada}_${fechaFormateada}_${idCorto}`;
        return await Compra_General.create({
            id_compra_general: uuidv4(),
            id_interno_compra_gen: identificadorInterno,
            estado_comp: 'C',
            fecha_inicio,
            id_empresa_sucursal: id_empre,
            ultimo_articulo_guardado,
            tipo_compra: tipo_compra
        })
    },

    findByPK_Compra_General: async (id_compra_general: string) => {
        return await Compra_General.findByPk(id_compra_general)
    },
    compraGeneralEmpresa: async (id_empresa_sucursal: string) => {
        const compra = await CompraRepository.getCompraEnCaptura(id_empresa_sucursal)
        return compra
    },
    actualizarEstadoCompras: async (id_empresa_sucursal: string) => {
        const compra = await CompraRepository.compraGeneralEmpresa(id_empresa_sucursal)
        // Obtener las compras por proveedor relacionadas
        const comprasProveedor = await Compra_Proveedor.findAll({
            where: { id_compra_general: compra.id_compra_general }
        });
        for (const compprov of comprasProveedor) {
            await compprov.update({
                estado_comp: 'A',
            });
        }

        await compra.update({
            estado_comp: 'A',
            fecha_fin_captura: new Date()
        });
        return compra
    },

    actualizarArticuloGuardadoUltimo: async (id_compra_general: string, id_artic: string) => {

        const compraGeneral = await Compra_General.findByPk(id_compra_general)

        return await compraGeneral.update({
            ultimo_articulo_guardado: id_artic
        })
    },
}