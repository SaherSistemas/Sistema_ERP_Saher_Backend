import { ICreateCompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface"

import { v4 as uuidv4 } from 'uuid';

import { ICreateCompra_General } from "../interface/Compra_General.interface";
import { Op, Sequelize, Transaction, WhereOptions } from "sequelize";

import { Empresa_SucursalRepository } from "../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { EmpleadoRepository } from "../../../RRHH/repositories/Empleado.repository";
import Compra_General from "../model/Compra_General";
import Compra_Proveedor from "../model/Compra_Proveedor";
/*
       Código	      Estado	                             Descripción
       C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
       A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
       F	        COMPLETADA	                             Fue recibido y se cerró la compra.
       D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
*/


export const CompraGeneralRepository = {
    actualizarTotalesCompraGeneralPorCompraProveedor: async (id_compra_proveedor: string, totalSinIva: number, totaliva: number, t?: Transaction) => {
        //OBTENER LA COMPRA GENERAL A LA QUE PERTENECE LA COMPRA PROVEEDOR
        const compraProveedor = await Compra_Proveedor.findByPk(id_compra_proveedor);
        if (!compraProveedor) throw new Error('Compra Proveedor no encontrada');
        const compraGeneral = await Compra_General.findByPk(compraProveedor.id_compra_general);
        if (!compraGeneral) throw new Error('Compra General no encontrada');
        return await compraGeneral.increment({
            total_compra_general: totalSinIva,
            total_iva_compra_general: totaliva,
        }, { transaction: t });
    },
    getAllCompra_GeneralSinPaginar: async (id_empresa: string) => {
        return await Compra_General.findAll({
            where: { id_empresa_sucursal: id_empresa },
            order: [['fecha_inicio', 'DESC']],
            attributes: ['id_compra_general']
        });
    },

    getAllCompra_General: async (id_empresa: string, page: number, limit: number) => {
        const offset = (page - 1) * limit;
        const { count, rows } = await Compra_General.findAndCountAll({
            where: {
                id_empresa_sucursal: id_empresa,
                fecha_completa_fin: { [Op.is]: null }
            },
            order: [['fecha_inicio', 'DESC']],
            limit,
            offset
        });
        return { total: count, compras: rows };
    },

    findByEmpresaYFiltro: async (id_empresa: string, { start, end }: { start: Date; end: Date }) => {
        return await Compra_General.findAll({
            where: {
                id_empresa_sucursal: id_empresa,
                fecha_inicio: {
                    [Op.between]: [start, end]
                }
            },
        })
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
        const compra = await CompraGeneralRepository.getCompraEnCaptura(id_empresa_sucursal)
        return compra
    },
    finalizarCapturaCompraGenYCompraProv: async (id_empresa_sucursal: string, id_empleado_finaliza: string) => {
        const compra = await CompraGeneralRepository.compraGeneralEmpresa(id_empresa_sucursal)
        // console.log(id_empleado_finaliza)
        // Obtener las compras por proveedor relacionadas
        const comprasProveedor = await Compra_Proveedor.findAll({
            where: { id_compra_general: compra.id_compra_general }
        });
        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado_finaliza)


        for (const compprov of comprasProveedor) {
            await compprov.update({
                estado_comp: 'A',
                id_empleado_compra: empleado.id_empleado,
            });
        }

        await compra.update({
            estado_comp: 'A',
            fecha_fin_captura: new Date(),

        });
        return compra
    },

    actualizarArticuloGuardadoUltimo: async (id_compra_general: string, id_artic: string) => {

        const compraGeneral = await Compra_General.findByPk(id_compra_general)

        return await compraGeneral.update({
            ultimo_articulo_guardado: id_artic
        })
    },

    updateTotalCompraGeneral: async (id_compra_general: string, subtotal: number, totalIva: number) => {
        const compraGeneral = await CompraGeneralRepository.findByPK_Compra_General(id_compra_general);

        return await compraGeneral.increment({
            total_compra_general: subtotal,
            total_iva_compra_general: totalIva,
        });
    },

    finalizarCompraGeneralSiEsNecesario: async (id_compra_general: string, pendientes: number, options?: { transaction?: Transaction }) => {
        if (pendientes === 0) {
            const compraGeneral = await CompraGeneralRepository.findByPK_Compra_General(id_compra_general);
            return await compraGeneral.update({
                estado_comp: 'F',
                fecha_completa_fin: new Date(),
            },
                {
                    transaction: options?.transaction
                });
        } else {

        }
    },


    //KPIS
    getTotales: async (whereCG: WhereOptions) => {
        return await Compra_General.findAll({
            where: whereCG,
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('total_compra_general')), 'total_compra_general'],
                [Sequelize.fn('SUM', Sequelize.col('total_iva_compra_general')), 'total_iva_compra_general'],
            ],
            group: ['id_empresa_sucursal']
        });
    },
    getIdsGenerales: async (whereCG: WhereOptions): Promise<string[]> => {
        const rows = await Compra_General.findAll({
            where: whereCG,
            attributes: ['id_compra_general'],
            raw: true,
        });
        return rows.map(r => (r as any).id_compra_general);
    },

}