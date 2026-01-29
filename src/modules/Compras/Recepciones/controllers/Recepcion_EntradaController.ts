import { Request, Response } from "express";
import { Recepcion_EntradaService } from "../services/Recepcion_Entrada.service";
import { AuthedRequest } from "../../../../middleware/auth";

export const Recepcion_EntradaController = {
    create: async (req: AuthedRequest, res: Response) => {
        try {

            const id_empresa = req.user?.id_empresa || String(req.query.id_empresa || "");
            const id_empleado_recibe = req.body.id_referencia;
            const creado = await Recepcion_EntradaService.create(req.body, id_empleado_recibe, id_empresa);

            // ✅ return SIEMPRE al responder
            res.status(201).json({
                ok: true,
                recepcion: { id_recepcion: creado.id_recepcion }
            });
        } catch (e: any) {
            console.error(e);
            // ✅ evita responder si ya se respondió
            if (res.headersSent) return;

            res.status(400).json({
                ok: false,
                message: e.message ?? "Error"
            });
        }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const rec = await Recepcion_EntradaService.getById(req.params.id);
            res.json({ ok: true, recepcion: rec });
        } catch (e: any) {
            res.status(404).json({ message: e.message ?? "No encontrado" });
        }
    },

    getFirma: async (req: Request, res: Response) => {
        try {
            const { firma_png, firma_mime } = await Recepcion_EntradaService.getFirma(req.params.id);
            res.setHeader("Content-Type", firma_mime);
            res.send(firma_png);
        } catch (e: any) {
            console.log(e)
            res.status(404).send(e.message ?? "No encontrado");
        }
    },

    list: async (req: AuthedRequest, res: Response) => {
        try {

            const id_empresa = req.user?.id_empresa || String(req.query.id_empresa || "");
            const data = await Recepcion_EntradaService.list({
                search: (req.query.search as string) || "",
                limit: Number(req.query.limit ?? 20),
                offset: Number(req.query.offset ?? 0),
            },
                id_empresa);
            res.json({ ok: true, ...data });
        } catch (e: any) {
            console.log(e)
            res.status(400).json({ message: e.message ?? "Error" });
        }
    },
};
