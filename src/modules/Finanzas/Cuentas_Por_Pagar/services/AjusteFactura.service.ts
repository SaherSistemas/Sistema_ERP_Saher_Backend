import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Ajuste_Factura_Proveedor from '../model/Ajuste_Factura_Proveedor';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import { Factura_Compra_ProveedorRepository } from '../repositories/Factura_Compra_Proveedor.repository';
import { NotasCreditoProveedorRepository } from '../../../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository';
import { Faltante_Factura_ProveedorRepository } from '../../../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository';
import { Compra_ProveedorRepository } from '../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository';

const aCentavos = (n: number) => Math.round(Number(n) * 100);

export const AjusteFacturaService = {

    listar: async (id_factura_proveedor: string) => {
        return await Ajuste_Factura_Proveedor.findAll({
            where: { id_factura_proveedor },
            order: [['created_at', 'ASC']],
            raw: true,
        });
    },

    // Registra el ajuste. Si con él la factura cuadra (recibido + NC + ajustes = total) se cierra igual que cuando
    // una nota de crédito la cuadra: factura finalizada, NC aplicadas, faltantes condonados y compra finalizada.
    crear: async (data: {
        id_factura_proveedor: string;
        monto: number;
        comentario: string;
        id_empleado?: string | null;
        usuario?: string | null;
    }) => {
        const monto = Number(data.monto);
        const comentario = String(data.comentario ?? '').trim();
        if (!data.id_factura_proveedor) throw new Error('Falta la factura.');
        if (!Number.isFinite(monto) || aCentavos(monto) === 0) throw new Error('El monto del ajuste debe ser distinto de cero.');
        if (comentario.length < 5) throw new Error('El comentario es obligatorio (explica por qué se ajusta).');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            const factura = await Factura_Compra_Proveedor.findByPk(data.id_factura_proveedor, { transaction: t });
            if (!factura) throw new Error('Factura no encontrada.');

            await Ajuste_Factura_Proveedor.create({
                id_factura_proveedor: data.id_factura_proveedor,
                monto,
                comentario,
                id_empleado: data.id_empleado ?? null,
                usuario: data.usuario ?? null,
            } as any, { transaction: t });

            const totalFactura  = Number(factura.total_factura_proveedor) + Number(factura.total_iva_factura);
            const totalRecibido = Number(factura.total_recibido_factura) + Number(factura.total_iva_recibido_factura);
            const notas = await NotasCreditoProveedorRepository.getNotasCreditoByFacturaProveedor(
                data.id_factura_proveedor, { transaction: t }
            );
            const totalNotas = notas.reduce((s: number, nc: any) => s + Number(nc.total_nc ?? 0), 0);
            const ajustes = await Ajuste_Factura_Proveedor.findAll({
                where: { id_factura_proveedor: data.id_factura_proveedor }, transaction: t, raw: true,
            });
            const totalAjustes = ajustes.reduce((s: number, a: any) => s + Number(a.monto ?? 0), 0);

            const cuadra = aCentavos(totalFactura) === aCentavos(totalRecibido + totalNotas + totalAjustes);

            if (cuadra) {
                await Factura_Compra_ProveedorRepository.updateEstadoFactura(data.id_factura_proveedor, 'F', { transaction: t });
                await NotasCreditoProveedorRepository.marcarAplicadas(data.id_factura_proveedor, { transaction: t });
                await Faltante_Factura_ProveedorRepository.marcarCondonadosByFactura(data.id_factura_proveedor, { transaction: t });
                const hayPendientes = await Factura_Compra_ProveedorRepository.hayFacturasEnDevolucion(
                    factura.id_compra_prove_factura, { transaction: t }
                );
                if (!hayPendientes) {
                    await Compra_ProveedorRepository.updateEstado(factura.id_compra_prove_factura, 'F', { transaction: t });
                }
            }

            await t.commit();
            return { ok: true, cuadra };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },
};
