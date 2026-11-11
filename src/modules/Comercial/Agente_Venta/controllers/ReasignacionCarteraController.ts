import type { Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import { ReasignacionCarteraService } from '../services/ReasignacionCartera.service';

// Solo administradores (mismo criterio que la regla de caducidad del agente)
const esAdmin = (req: AuthedRequest) => {
    const prioridad = (req.user as any)?.prioridad;
    return prioridad != null && Number(prioridad) <= 2;
};

export class ReasignacionCarteraController {

    // GET /agente/:id_agente/cartera → clientes del agente y lo que se movería con cada uno
    static cartera = async (req: AuthedRequest, res: Response) => {
        try {
            if (!esAdmin(req)) { res.status(403).json({ message: 'Solo un administrador puede reasignar la cartera de un agente.' }); return; }
            res.status(200).json(await ReasignacionCarteraService.cartera(req.params.id_agente));
        } catch (error: any) {
            if (error?.status) { res.status(error.status).json({ message: error.message }); return; }
            console.error(error);
            res.status(500).json({ message: 'Error al consultar la cartera del agente.' });
        }
    };

    // POST /agente/:id_agente/reasignar-cartera  { asignaciones: [{ id_cliente_alm, id_agente_destino }] }
    static reasignar = async (req: AuthedRequest, res: Response) => {
        try {
            if (!esAdmin(req)) { res.status(403).json({ message: 'Solo un administrador puede reasignar la cartera de un agente.' }); return; }
            const resultado = await ReasignacionCarteraService.reasignar(
                req.params.id_agente,
                req.body?.asignaciones,
                req.user?.username ?? 'desconocido',
            );
            res.status(200).json(resultado);
        } catch (error: any) {
            if (error?.status) { res.status(error.status).json({ message: error.message }); return; }
            console.error(error);
            res.status(500).json({ message: 'Error al reasignar la cartera del agente.' });
        }
    };
}
