import { ICreateCompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface"

import { v4 as uuidv4 } from 'uuid';

import { ICreateCompra_General } from "../interface/Compra_General.interface";
import { Op, QueryTypes, Sequelize, Transaction, WhereOptions } from "sequelize";

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

        // Importe pedido (cantidad × precio de lo solicitado, sin IVA). total_compra_general
        // solo se llena al capturar facturas, así que una compra recién enviada marcaba $0.
        if (rows.length > 0) {
            const pedidos = await Compra_General.sequelize!.query<{ id_compra_general: string; total_pedido: string }>(`
                SELECT cp.id_compra_general,
                       COALESCE(SUM(d.cantidad_detcompsol * d.precio_detcompsol), 0) AS total_pedido
                FROM detalle_compra_solicitado d
                JOIN compra_proveedor cp ON cp.id_comp = d.idcompr_detcompsol
                WHERE cp.id_compra_general IN (:ids)
                GROUP BY cp.id_compra_general
            `, {
                type: QueryTypes.SELECT,
                replacements: { ids: rows.map(r => r.id_compra_general) },
            });
            const porCompra = new Map(pedidos.map(p => [p.id_compra_general, Number(p.total_pedido)]));
            rows.forEach(r => r.setDataValue('total_pedido' as any, porCompra.get(r.id_compra_general) ?? 0));
        }

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


    // tipo_compra opcional: si se pasa, solo busca la compra en captura DE ESE TIPO
    // (evita que una Normal/Negados/Especial se cuele dentro de una Directa abierta
    // por error, o viceversa). Sin el parámetro, se mantiene el comportamiento viejo
    // ("cualquiera que esté abierta") para los usos que solo necesitan saber si HAY
    // algo abierto, sin importar de qué tipo.
    getCompraEnCaptura: async (id_empresa: string, tipo_compra?: string) => {
        return await Compra_General.findOne({
            where: {
                id_empresa_sucursal: id_empresa,
                estado_comp: 'C',
                ...(tipo_compra ? { tipo_compra } : {}),
            },
            include: [
                { model: Compra_General, as: 'compraPrevia', attributes: ['id_compra_general', 'id_interno_compra_gen'] },
            ],
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
            tipo_compra: tipo_compra,
            id_compra_general_previa: data.id_compra_general_previa ?? null,
        })
    },

    findByPK_Compra_General: async (id_compra_general: string) => {
        return await Compra_General.findByPk(id_compra_general)
    },


    compraGeneralEmpresa: async (id_empresa_sucursal: string) => {
        const compra = await CompraGeneralRepository.getCompraEnCaptura(id_empresa_sucursal)
        return compra
    },

    // Última compra de esta empresa finalizada HOY que aún no se envió al proveedor
    // (estado 'A' = capturada pero no enviada). Se usa para relacionar una compra
    // nueva con una que se finalizó por accidente el mismo día, sin reabrirla.
    getUltimaFinalizadaMismoDiaSinEnviar: async (id_empresa_sucursal: string, tipo_compra: string) => {
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);

        return await Compra_General.findOne({
            where: {
                id_empresa_sucursal,
                estado_comp: 'A',
                tipo_compra,
                fecha_fin_captura: { [Op.gte]: inicioDia },
            },
            order: [['fecha_fin_captura', 'DESC']],
        });
    },

    // Regresa a "Capturando" una compra que se había finalizado por accidente
    // (y su(s) compra_proveedor relacionadas), para poder seguir acumulando
    // artículos en la misma en vez de crear una compra aparte.
    reabrirCompra: async (id_compra_general: string) => {
        await Compra_Proveedor.update(
            { estado_comp: 'C' },
            { where: { id_compra_general, estado_comp: 'A' } },
        );
        await Compra_General.update(
            { estado_comp: 'C', fecha_fin_captura: null as any },
            { where: { id_compra_general } },
        );
        return await Compra_General.findByPk(id_compra_general);
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

    updateTotalCompraGeneral: async (
        id_compra_general: string,
        subtotal: number,
        totalIva: number,
        t?: Transaction
    ) => {
        return await Compra_General.update(
            {
                total_compra_general: subtotal,
                total_iva_compra_general: totalIva,
            },
            {
                where: { id_compra_general },
                transaction: t,
            }
        );
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
    eliminarCompraGeneral: async (id_compra_general: string) => {
        return await Compra_General.destroy({
            where: { id_compra_general }
        });
    },
}