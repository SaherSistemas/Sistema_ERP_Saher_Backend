import type { Request, Response } from 'express';

export class UploadsController {
    // GET paginado (si lo necesitas)
    static uploadsFacturaProveedor = async (req: Request, res: Response) => {
        console.log("UBIENDO ")
        if (!req.file) {
            res.status(400).json({ mensaje: 'No se recibió archivo' });
        }

        const filename = req.file.filename;

        // URL pública que corresponde a esa carpeta
        const urlPublica = `http://farmaciasyg.hopto.org/sistema/pruebas/${filename}`;

        res.json({
            ok: true,
            url: urlPublica
        });
    };


}
