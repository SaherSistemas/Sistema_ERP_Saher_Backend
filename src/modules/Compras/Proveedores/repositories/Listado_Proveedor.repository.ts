import Listado_Proveedor from '../model/Listados_Proveedor';
import Detalle_Listado_Proveedor from '../model/Detalle_Listado_Proveedor';
import Proveedor from '../model/Proveedor';
import { Op, Transaction } from 'sequelize';

export const Listado_ProveedorRepository = {
    getAllProveedorConListados: async () => {
        return await Proveedor.findAll({
            attributes: ['nomcort_prove', 'id_prove'],
            include: [{
                model: Listado_Proveedor,
                attributes: ['createdAt', 'id_listprove'],
                required: false, // 👈 esto asegura que entren proveedores aunque no tengan listado
            }],
            order: [['nomcort_prove', 'ASC']]
        });
    },
    getByID: async (id: string) => {
        return await Listado_Proveedor.findByPk(id)
    },
    getProductoPorProveedorEnListas: async (cod_barra_pro_detlist: string) => {
        return await Detalle_Listado_Proveedor.findAll({
            where: { cod_barra_pro_detlist: cod_barra_pro_detlist.trim() },
            order: [["preio_pro_detlist", "ASC"]],
            attributes: ['cod_barra_pro_detlist', 'descrip_pro_detlis', 'exist_pro_detlist', 'preio_pro_detlist'],
            include: [{
                model: Listado_Proveedor,
                attributes: ['id_listprove'],
                include: [{
                    model: Proveedor,
                    attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove']
                }]
            }]
        });
    },
    getProductosPorFiltro: async (filtro: string) => {
        return await Detalle_Listado_Proveedor.findAll({
            where: {
                [Op.or]: [
                    { cod_barra_pro_detlist: { [Op.iLike]: `%${filtro}%` } },
                    { descrip_pro_detlis: { [Op.iLike]: `%${filtro}%` } }
                ]
            },
            order: [
                ['cod_barra_pro_detlist', 'ASC'],           // Agrupa por código de barras
                ['preio_pro_detlist', 'ASC']               // Precio de mayor a menor
            ],
            attributes: [
                'cod_barra_pro_detlist',
                'descrip_pro_detlis',
                'exist_pro_detlist',
                'preio_pro_detlist'
            ],
            include: [{
                model: Listado_Proveedor,
                attributes: ['id_listprove'],
                include: [{
                    model: Proveedor,
                    attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove']
                }]
            }]
        });
    },


    crearListado: async (id_listado: string, id_proveedor: string, t?: Transaction) => {
        return await Listado_Proveedor.create({
            id_listprove: id_listado,
            id_prove_listprove: id_proveedor
        }, { transaction: t });
    },

    insertarDetalles: async (detalles: any[], t?: Transaction) => {
        return await Detalle_Listado_Proveedor.bulkCreate(detalles, {
            updateOnDuplicate: [
                "cod_barra_pro_detlist",
                "descrip_pro_detlis",
                "exist_pro_detlist",
                "preio_pro_detlist"
            ],
            transaction: t,
        });
    },
    // Borra TODOS los listados que tenga el proveedor (por si ya había más de uno) y sus detalles.
    eliminarListadoPorProveedor: async (id_proveedor: string, t?: Transaction) => {
        const listadosExistentes = await Listado_Proveedor.findAll({
            where: { id_prove_listprove: id_proveedor },
            transaction: t,
        });
        if (!listadosExistentes.length) return;

        await Detalle_Listado_Proveedor.destroy({
            where: { id_list_detlist: { [Op.in]: listadosExistentes.map(l => l.id_listprove) } },
            transaction: t,
        });
        await Listado_Proveedor.destroy({
            where: { id_prove_listprove: id_proveedor },
            transaction: t,
        });
    }

}
