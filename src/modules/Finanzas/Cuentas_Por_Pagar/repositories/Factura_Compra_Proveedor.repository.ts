import { v4 as uuidv4 } from 'uuid';
import { IFactura_Compra_Proveedor, ICreateFacturaCompraProveedor } from '../interface/Factura_Compra_Proveedor.interfece';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import { Compra_ProveedorRepository } from '../../../Compras/repositories/Compra_Proveedor.repository';
import Proveedor from '../../../Proveedores/model/Proveedor';
import Compra_Proveedor from '../../../Compras/model/Compra_Proveedor';
import { Transaction } from 'sequelize';
import { EmpleadoRepository } from '../../../../repository/Usuarios/Empleado.repository';
export const Factura_Compra_ProveedorRepository = {
    getAll: async () => {
        return await Factura_Compra_Proveedor.findAll({
            where: { estado_factura_proveedor: 'C' },
            include: [
                {
                    model: Compra_Proveedor,
                    attributes: ['id_comp', 'idprove_comp'],
                    include: [
                        {
                            model: Proveedor,
                            attributes: ['id_prove', 'nomcort_prove'],
                        },
                    ],
                },
            ],
        });
    },
    getByID: async (id_comp: string) => {
        return await Factura_Compra_Proveedor.findOne({
            where: {
                id_compra_proveedor: id_comp
            }
        });
    },
    actualizarTotalesFactura: async (id_factura_compra_proveedor: string, totalSinIva: number, totaliva: number, id_empleado_registro_lotes: number, t?: Transaction) => {
        //AQUI SOLO SE HACE UPDATE DE LOS TOTALES DE LA FACTURA

        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado_registro_lotes);
        if (!empleado) throw new Error('Empleado no encontrado');
        return await Factura_Compra_Proveedor.update({
            total_factura_proveedor: totalSinIva,
            total_iva_factura: totaliva,
            fin_de_registro_lotes: new Date(),
            id_empleado_registro_lotes: empleado.id_empleado,
        }, { where: { id_factura_proveedor: id_factura_compra_proveedor }, transaction: t })
    },
    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        //console.log(data)
        const compraProveedor = await Compra_ProveedorRepository.getByID(data.id_compra_prove_factura);

        if (!compraProveedor) throw new Error('Compra proveedor no encontrada');

        const updates: any = {};

        // Acumular costo por envío
        updates.costo_por_envio = Number(compraProveedor.costo_por_envio || 0) + Number(data.costo_por_envio || 0);

        // Solo colocar fecha si aún no existe
        if (!compraProveedor.inicio_de_registro_lotes) {
            updates.inicio_de_registro_lotes = new Date();
        }

        // No actualizar estado_comp si ya tiene uno definido
        // (Si quieres permitir que se cambie solo si estaba en otro estado, aquí se ajusta)
        // updates.estado_comp = compraProveedor.estado_comp; // NO se toca

        await compraProveedor.update(updates);

        return await Factura_Compra_Proveedor.create({
            id_factura_proveedor: uuidv4(),
            id_compra_prove_factura: data.id_compra_prove_factura,
            folio_factura_proveedor: data.folio_factura_proveedor,
            fecha_emision: data.fecha_emision,
            fecha_vencimiento: data.fecha_vencimiento,
            total_factura_proveedor: data.total_factura_proveedor,
            estatus_pago_factura: 'PENDIENTE',
            estado_factura_proveedor: 'C',
            url_PDF: '',
            url_XML: '',
            inicio_de_registro_lotes: new Date()
        });
    }





}