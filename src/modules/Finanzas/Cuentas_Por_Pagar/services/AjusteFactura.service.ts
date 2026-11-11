import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import Ajuste_Factura_Proveedor from '../model/Ajuste_Factura_Proveedor';
import NotasCreditoProveedor from '../../../../models/Devolucion_NC/NC/NotasCreditoProveedor';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import { Factura_Compra_ProveedorRepository } from '../repositories/Factura_Compra_Proveedor.repository';
import { NotasCreditoProveedorRepository } from '../../../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository';
import { Faltante_Factura_ProveedorRepository } from '../../../../repository/Devoluciones_NC/Faltante_Factura_Proveedor.repository';
import { Compra_ProveedorRepository } from '../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository';
import { cuadraConTolerancia } from '../helpers/toleranciaFactura';

const aCentavos = (n: number) => Math.round(Number(n) * 100);

// ¿Cuadra la factura? (recibido + notas de crédito + ajustes = total). Si cuadra se cierra igual que cuando una
// nota de crédito la cuadra: factura finalizada, NC aplicadas, faltantes condonados y compra finalizada.
async function cerrarSiCuadra(factura: Factura_Compra_Proveedor, t: Transaction): Promise<boolean> {
    const id = factura.id_factura_proveedor;
    const totalFactura  = Number(factura.total_factura_proveedor) + Number(factura.total_iva_factura);
    const totalRecibido = Number(factura.total_recibido_factura) + Number(factura.total_iva_recibido_factura);
    const notas = await NotasCreditoProveedorRepository.getNotasCreditoByFacturaProveedor(id, { transaction: t });
    const totalNotas = notas.reduce((s: number, nc: any) => s + Number(nc.total_nc ?? 0), 0);
    const ajustes = await Ajuste_Factura_Proveedor.findAll({ where: { id_factura_proveedor: id }, transaction: t, raw: true });
    const totalAjustes = ajustes.reduce((s: number, a: any) => s + Number(a.monto ?? 0), 0);

    const cuadra = cuadraConTolerancia(totalFactura, totalRecibido + totalNotas + totalAjustes);
    if (cuadra) {
        await Factura_Compra_ProveedorRepository.updateEstadoFactura(id, 'F', { transaction: t });
        await NotasCreditoProveedorRepository.marcarAplicadas(id, { transaction: t });
        await Faltante_Factura_ProveedorRepository.marcarCondonadosByFactura(id, { transaction: t });
        const hayPendientes = await Factura_Compra_ProveedorRepository.hayFacturasEnDevolucion(
            factura.id_compra_prove_factura, { transaction: t }
        );
        if (!hayPendientes) {
            await Compra_ProveedorRepository.updateEstado(factura.id_compra_prove_factura, 'F', { transaction: t });
        }
    }
    return cuadra;
}

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

            const cuadra = await cerrarSiCuadra(factura, t);

            await t.commit();
            return { ok: true, cuadra };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    // Quita una nota de crédito PENDIENTE (la automática del chequeo) que no debería existir, p. ej. porque la mercancía
    // sí llegó. La nota queda ANULADA ('X', en $0: conserva su historia en el motivo), sus faltantes se condonan y se
    // registra un ajuste por el mismo importe con el comentario, para que la factura siga cuadrada y se cierre.
    quitarNotaCredito: async (data: {
        id_nc: string;
        comentario: string;
        id_empleado?: string | null;
        usuario?: string | null;
    }) => {
        const comentario = String(data.comentario ?? '').trim();
        if (!data.id_nc) throw new Error('Falta la nota de crédito.');
        if (comentario.length < 5) throw new Error('El comentario es obligatorio (explica por qué se quita la nota de crédito).');

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            const nc = await NotasCreditoProveedor.findByPk(data.id_nc, { transaction: t, lock: t.LOCK.UPDATE });
            if (!nc) throw new Error('Nota de crédito no encontrada.');
            if (nc.estado_nc !== 'P') {
                throw new Error('Solo se puede quitar una nota de crédito pendiente (no una aplicada o cerrada).');
            }
            const factura = await Factura_Compra_Proveedor.findByPk(nc.id_factura_proveedor, { transaction: t });
            if (!factura) throw new Error('Factura no encontrada.');

            const monto = Number(nc.total_nc);
            const quien = data.usuario ? ` (${data.usuario})` : '';
            await nc.update({
                total_nc: 0,
                estado_nc: 'X',
                motivo_nc: `ANULADA por $${monto.toFixed(2)}${quien}: ${comentario}\n---\n${nc.motivo_nc ?? ''}`,
            }, { transaction: t });

            await Faltante_Factura_ProveedorRepository.marcarCondonadosByNc(nc.id_nc, { transaction: t });

            if (aCentavos(monto) !== 0) {
                await Ajuste_Factura_Proveedor.create({
                    id_factura_proveedor: factura.id_factura_proveedor,
                    monto,
                    comentario: `Se quitó la nota de crédito ${nc.folio_nc}: ${comentario}`,
                    id_empleado: data.id_empleado ?? null,
                    usuario: data.usuario ?? null,
                } as any, { transaction: t });
            }

            const cuadra = await cerrarSiCuadra(factura, t);

            await t.commit();
            return { ok: true, cuadra, monto };
        } catch (error) {
            await t.rollback();
            throw error;
        }
    },
};
