import { Request, Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import Agente_Regla_Caducidad from '../model/Agente_Regla_Caducidad';

export class AgenteCaducidadController {

    // GET /agente-caducidad/:id_agente → { meses_min_caducidad } (0 = sin regla)
    static get = async (req: Request, res: Response) => {
        try {
            const r = await Agente_Regla_Caducidad.findByPk(req.params.id_agente);
            res.status(200).json({ meses_min_caducidad: Number(r?.meses_min_caducidad ?? 0) });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ mensaje: 'Error al consultar la regla de caducidad del agente.' });
        }
    };

    // PUT /agente-caducidad/:id_agente  { meses_min_caducidad } — solo administradores
    static guardar = async (req: AuthedRequest, res: Response) => {
        try {
            const prioridad = (req.user as any)?.prioridad;
            if (prioridad == null || Number(prioridad) > 2) {
                res.status(403).json({ mensaje: 'Solo un administrador puede cambiar la regla de caducidad de un agente.' });
                return;
            }
            const meses = Number(req.body?.meses_min_caducidad);
            if (!Number.isInteger(meses) || meses < 0 || meses > 60) {
                res.status(400).json({ mensaje: 'Los meses mínimos de caducidad deben ser un número entero de 0 a 60 (0 = sin regla).' });
                return;
            }
            await Agente_Regla_Caducidad.upsert({ id_agente: req.params.id_agente, meses_min_caducidad: meses } as any);
            console.log(`[Agente ${req.params.id_agente}] ${req.user?.username ?? 'desconocido'} fijó la caducidad mínima en ${meses} mes(es)`);
            res.status(200).json({ ok: true, meses_min_caducidad: meses });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ mensaje: 'Error al guardar la regla de caducidad del agente.' });
        }
    };
}
