import { Request, Response } from "express";
import { NotaCreditoService } from "../../services/NotaCredito/NotaCredito.service";

export class NotaCreditoController {
    static crearNotaCredito = async (req: Request, res: Response) => {
        try {
            const { compraId } = req.params;

            // Archivos subidos por multer
            const pdfFiles = (req.files as Record<string, Express.Multer.File[]>)?.pdf ?? [];
            const xmlFiles = (req.files as Record<string, Express.Multer.File[]>)?.xml ?? [];

            // Campos (req.body) vienen como strings en multipart/form-data
            const { monto, motivo, timbrada, tipo, productos } = req.body as {
                monto?: string;
                motivo?: string;
                timbrada?: string;
                tipo?: string;
                productos?: string; // viene como string (JSON) desde el front
            };



            const notaCredito = await NotaCreditoService.crearNotaCredito({
                compraId,
                monto,
                motivo,
                timbrada,
                tipo,
                productos,
                pdfFiles,
                xmlFiles
            });
         

            // Aquí puedes continuar con tu lógica (validar, guardar en DB, etc.)
            res.status(200).json({ ok: true, message: "Payload recibido y logueado." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al procesar la nota de crédito", error });
        }
    };

}

