import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { NotaCreditoClienteRepository } from '../repositories/Nota_Credito_Cliente.repository';

export const NotaCreditoClienteController = {

    // GET /notas-credito?estatus=DISPONIBLE&id_cliente_alm=...
    getAll: async (req: AuthedRequest, res: Response) => {
        try {
            const { estatus, id_cliente_alm } = req.query as Record<string, string>;
            const data = await NotaCreditoClienteRepository.getAll({
                estatus: estatus || undefined,
                id_cliente_alm: id_cliente_alm || undefined,
            });
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /notas-credito/cliente/:id_cliente_alm  — disponibles + parciales del cliente
    getDisponiblesCliente: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await NotaCreditoClienteRepository.getDisponiblesCliente(req.params.id_cliente_alm);
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // GET /notas-credito/:id
    getById: async (req: AuthedRequest, res: Response) => {
        try {
            const data = await NotaCreditoClienteRepository.getById(req.params.id);
            if (!data) res.status(404).json({ message: 'Nota de crédito no encontrada.' });
            res.status(200).json(data);
        } catch (error: any) {
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },

    // POST /notas-credito/:id/aplicar
    // Body: { id_cxc: string, monto_aplicar: number }
    aplicar: async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado_aplica = req.user!.id_referencia_persona;
            const { id_cxc, monto_aplicar } = req.body;

            if (!id_cxc || monto_aplicar == null) {
                res.status(400).json({ message: 'Se requiere id_cxc y monto_aplicar.' });
            }

            const resultado = await NotaCreditoClienteRepository.aplicar({
                id_nota_credito: req.params.id,
                id_cxc,
                monto_aplicar: Number(monto_aplicar),
                id_empleado_aplica,
            });

            const fmt = (n: number) => `$${n.toFixed(2)}`;
            const notaMsg = resultado.estatus_nota === 'APLICADA'
                ? `La nota de crédito quedó completamente aplicada.`
                : `Saldo restante en la nota: ${fmt(resultado.saldo_nota_restante)}.`;

            res.status(200).json({
                message: `Se aplicaron ${fmt(resultado.monto_aplicado)} a la cuenta por cobrar. ${notaMsg}`,
                ...resultado,
            });
        } catch (error: any) {
            console.error('Error al aplicar nota de crédito:', error);
            res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
        }
    },
};
