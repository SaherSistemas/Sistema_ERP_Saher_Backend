import { dbLocal } from "../../../config/db";
import MonederoCliente from "../../../models/Clientes/Monedero/Monedero";
import { MovimientoMonederoService } from "../../../services/Clientes/Monedero/Movimiento_Monedero.service";
import type { Request, Response } from "express";

export const MovimientoMonederoController = {

    // Obtener movimientos de un monedero
    getMovimientosByMonedero: async (req: Request, res: Response) => {
        try {
            const { id_monedero } = req.params;

            if (!id_monedero) {
                res.status(400).json({ error: "id_monedero requerido." });
            }

            const movimientos = await MovimientoMonederoService.getMovimientosByMonedero(id_monedero);

            res.json({ movimientos });

        } catch (error: any) {
            console.error("Error getMovimientos:", error);
            res.status(500).json({ error: error.message || "Error interno del servidor" });
        }
    },

    ajustarSaldo: async (req: Request, res: Response) => {
        const t = await dbLocal.transaction();
        try {
            const { id_monedero } = req.params;
            const { monto, referencia } = req.body;

            if (!id_monedero || monto == null) {
                await t.rollback();
                res.status(400).json({ error: "Datos incompletos" });
            }

            const monedero = await MonederoCliente.findByPk(id_monedero, {
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!monedero) {
                await t.rollback();
                res.status(404).json({ error: "Monedero no encontrado" });
            }

            const saldoActual = Number(monedero.saldo_monedero);
            const nuevoSaldo = saldoActual + Number(monto);

            await monedero.update(
                { saldo_monedero: nuevoSaldo },
                { transaction: t }
            );

            await MovimientoMonederoService.registrarMovimiento(
                id_monedero,
                monto >= 0 ? "AJUSTE" : "REVERSO",
                Math.abs(monto),
                referencia || "AJUSTE MANUAL",
                t
            );

            await t.commit();
            res.json({ nuevoSaldo });

        } catch (error: any) {
            await t.rollback();
            console.error("Error ajustarSaldo:", error);
            res.status(500).json({ error: error.message || "Error interno del servidor" });
        }
    },

};
