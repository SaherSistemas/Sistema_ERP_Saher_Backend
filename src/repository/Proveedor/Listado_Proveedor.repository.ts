import Listado_Proveedor from '../../models/Proveedor/Listados_Proveedor';
import Detalle_Listado_Proveedor from '../../models/Proveedor/Detalle_Listado_Proveedor';
import Proveedor from '../../models/Proveedor/Proveedor';
import { Op } from 'sequelize';

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
            where: { cod_barra_pro_detlist },
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


    crearListado: async (id_listado: string, id_proveedor: string) => {
        return await Listado_Proveedor.create({
            id_listprove: id_listado,
            id_prove_listprove: id_proveedor
        });
    },

    insertarDetalles: async (detalles: any[]) => {
        return await Detalle_Listado_Proveedor.bulkCreate(detalles, {
            updateOnDuplicate: [
                "cod_barra_pro_detlist",
                "descrip_pro_detlis",
                "exist_pro_detlist",
                "preio_pro_detlist"
            ]
        });
    },
    eliminarListadoPorProveedor: async (id_proveedor: string) => {
        const listadoExistente = await Listado_Proveedor.findOne({
            where: { id_prove_listprove: id_proveedor }
        });

        if (listadoExistente) {
            await Detalle_Listado_Proveedor.destroy({
                where: { id_list_detlist: listadoExistente.id_listprove }
            });

            await Listado_Proveedor.destroy({
                where: { id_prove_listprove: id_proveedor }
            });
        }
    }

}
