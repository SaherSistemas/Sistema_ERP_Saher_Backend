import type { Request, Response } from 'express';
import { Comision_Regla_AgenteService } from '../services/Comision_Regla_Agente.service';

export class Comision_Regla_AgenteController {

    // ── GET /api/comision-reglas
    // Devuelve todas las reglas de todos los agentes (carga inicial del frontend)
    static getAll = async (req: Request, res: Response) => {
        try {
            const reglas = await Comision_Regla_AgenteService.getAll();
            res.status(200).json({ reglas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las reglas de comisión.' });
        }
    };

    // ── GET /api/comision-reglas/agente/:id_agente
    // Reglas de un agente concreto
    static getByAgente = async (req: Request, res: Response) => {
        try {
            const { id_agente } = req.params;
            const reglas = await Comision_Regla_AgenteService.getByAgente(id_agente);
            res.status(200).json({ reglas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener las reglas del agente.' });
        }
    };

    // ── PUT /api/comision-reglas/agente/:id_agente/base
    // Crea o actualiza la regla base del agente
    // Body: { regla_json: { tipo, pct } | { tipo, tramos } }
    static upsertReglaBase = async (req: Request, res: Response) => {
        try {
            const { id_agente } = req.params;
            const { regla_json } = req.body;

            if (!regla_json) {
                res.status(400).json({ message: 'El campo regla_json es requerido.' });
                return;
            }

            const regla = await Comision_Regla_AgenteService.upsertReglaBase({ id_agente, regla_json });
            res.status(200).json({ message: 'Regla base guardada correctamente.', regla });
        } catch (error: any) {
            console.error(error);
            const status = /requerido|porcentaje|tramo|tipo/i.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al guardar la regla base.' });
        }
    };

    // ── PUT /api/comision-reglas/agente/:id_agente/excepcion/:id_cliente_alm
    // Crea o actualiza la excepción de un cliente específico dentro de un agente
    // Body: { regla_json: { tipo, pct } | { tipo, tramos } }
    static upsertExcepcion = async (req: Request, res: Response) => {
        try {
            const { id_agente, id_cliente_alm } = req.params;
            const { regla_json } = req.body;

            if (!regla_json) {
                res.status(400).json({ message: 'El campo regla_json es requerido.' });
                return;
            }

            const regla = await Comision_Regla_AgenteService.upsertExcepcion({
                id_agente,
                id_cliente_alm,
                regla_json,
            });
            res.status(200).json({ message: 'Excepción guardada correctamente.', regla });
        } catch (error: any) {
            console.error(error);
            const status = /requerido|porcentaje|tramo|tipo/i.test(error.message) ? 400 : 500;
            res.status(status).json({ message: error.message ?? 'Error al guardar la excepción.' });
        }
    };

    // ── DELETE /api/comision-reglas/agente/:id_agente/excepcion/:id_cliente_alm
    // Elimina la excepción de un cliente (vuelve a usar la regla base)
    static deleteExcepcion = async (req: Request, res: Response) => {
        try {
            const { id_agente, id_cliente_alm } = req.params;
            await Comision_Regla_AgenteService.deleteExcepcion(id_agente, id_cliente_alm);
            res.status(200).json({ message: 'Excepción eliminada. El cliente usará la regla base del agente.' });
        } catch (error: any) {
            console.error(error);
            const status = /no encontrada/i.test(error.message) ? 404 : 500;
            res.status(status).json({ message: error.message ?? 'Error al eliminar la excepción.' });
        }
    };

    // ── GET /api/comision-reglas/agente/:id_agente/efectiva/:id_cliente_alm
    // Devuelve la regla que se aplicará a un par agente/cliente (excepción o base)
    static getReglaEfectiva = async (req: Request, res: Response) => {
        try {
            const { id_agente, id_cliente_alm } = req.params;
            const regla = await Comision_Regla_AgenteService.getReglaEfectiva(id_agente, id_cliente_alm);
            res.status(200).json({ regla });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al obtener la regla efectiva.' });
        }
    };
}
