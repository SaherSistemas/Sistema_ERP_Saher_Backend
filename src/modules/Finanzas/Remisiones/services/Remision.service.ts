import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { ICreateRemision } from '../interface/Remision.interface';
import { RemisionRepository } from '../repositories/Remision.repository';
import { Detalle_RemisionRepository } from '../repositories/Detalle_Remision.repository';
import { CxCRepository } from '../../Cuentas_Por_Cobrar/repositories/CxC.repository';
import { generarRemisionPDFBuffer } from '../helpers/remision.pdf';
import Facturas from '../../../Facturas/model/Facturas.model';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';

export const RemisionService = {

    getAll: async () => {
        return await RemisionRepository.getAll();
    },

    getByCliente: async (id_cliente_alm: string) => {
        return await RemisionRepository.getByCliente(id_cliente_alm);
    },

    getByIdConDetalles: async (id_remision: string) => {
        const remision = await RemisionRepository.getByIdConDetalles(id_remision);
        if (!remision) throw new Error('Remisión no encontrada');
        return remision;
    },

    generarPdf: async (id_remision: string): Promise<Buffer> => {
        const datos = await RemisionRepository.getDatosParaPDF(id_remision);
        if (!datos) throw new Error('Remisión no encontrada');
        return generarRemisionPDFBuffer(datos);
    },

    // El frontend solo manda id_factura + dias_credito + detalles
    // El service resuelve cliente y agente desde el Pedido automáticamente
    create: async (data: ICreateRemision) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
        });

        try {
            // 1) Obtener la factura para llegar al pedido
            const factura = await Facturas.findByPk(data.id_factura, {
                include: [{ model: Pedido_Almacen, as: 'pedido' }]
            });
            if (!factura) throw new Error('Factura no encontrada');

            const pedido = (factura as any).pedido as Pedido_Almacen;
            if (!pedido) throw new Error('El pedido asociado a la factura no fue encontrado');

            // 2) Del pedido sacamos el cliente real y el agente
            const id_cliente_alm = pedido.id_cliente_pedido_alm;
            const id_agente = pedido.id_agente_pedido_alm;
            const id_pedido_alm = pedido.id_pedido_alm;

            // 3) Calcular totales desde los detalles
            const subtotal_remision = data.detalles.reduce((acc, d) => acc + d.subtotal, 0);
            const iva_remision = data.detalles.reduce((acc, d) => acc + d.importe_iva, 0);
            const total_remision = subtotal_remision + iva_remision;

            // 4) Folio consecutivo
            const folio = await RemisionRepository.getUltimoFolio();

            // 5) Crear remisión
            const remision = await RemisionRepository.create(
                {
                    id_factura: data.id_factura,
                    id_pedido_alm,
                    id_cliente_alm,
                    id_agente,
                    dias_credito: data.dias_credito,
                    subtotal_remision,
                    iva_remision,
                    total_remision,
                    notas: data.notas,
                },
                folio,
                t
            );

            // 6) Crear detalles
            await Detalle_RemisionRepository.createMultiple(remision.id_remision, data.detalles, t);

            // 7) Crear CxC automáticamente con el cliente real del pedido
            await CxCRepository.create({
                id_remision: remision.id_remision,
                id_cliente_alm,
                monto_total: total_remision,
                fecha_vencimiento: remision.fecha_vencimiento,
                dias_credito: data.dias_credito,
            }, t);

            await t.commit();
            return remision;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },
};
