import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ImagenPublicidadRepository } from '../repository/Imagen_Publicidad.repository';

// ── Directorio de uploads ────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../../../uploads/publicidad');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
});

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        if (/image\/(jpeg|jpg|png|gif|webp|svg\+xml)/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp, svg).'));
    },
}).single('imagen');

// ── Controllers ──────────────────────────────────────────────────────────────
export class ImagenPublicidadController {

    static getByEmpresa = async (req: Request, res: Response) => {
        try {
            const { id_empre } = req.params;
            const imgs = await ImagenPublicidadRepository.getByEmpresa(id_empre);
            res.json(imgs);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    };

    static getByEmpresaActivas = async (req: Request, res: Response) => {
        try {
            const { id_empre } = req.params;
            const imgs = await ImagenPublicidadRepository.getByEmpresaActivas(id_empre);
            res.json(imgs);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    };

    static upload = async (req: Request, res: Response) => {
        uploadMiddleware(req, res, async (err) => {
            if (err) res.status(400).json({ error: err.message });
            if (!req.file) res.status(400).json({ error: 'No se recibió ningún archivo.' });

            try {
                const { id_empre, titulo } = req.body;
                if (!id_empre) res.status(400).json({ error: 'id_empre es requerido.' });

                const ruta_imagen = `/uploads/publicidad/${req.file.filename}`;
                const img = await ImagenPublicidadRepository.create({ id_empre, titulo: titulo || null, ruta_imagen });
                res.status(201).json(img);
            } catch (e: any) {
                res.status(500).json({ error: e.message });
            }
        });
    };

    static update = async (req: Request, res: Response) => {
        try {
            const { id_imagen } = req.params;
            const { titulo, orden, activa } = req.body;
            await ImagenPublicidadRepository.update(id_imagen, { titulo, orden, activa });
            res.json({ ok: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    };

    static reordenar = async (req: Request, res: Response) => {
        try {
            const { ids } = req.body; // array of id_imagen in new order
            if (!Array.isArray(ids)) res.status(400).json({ error: 'ids debe ser un array.' });
            await ImagenPublicidadRepository.reordenar(ids);
            res.json({ ok: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    };

    static delete = async (req: Request, res: Response) => {
        try {
            const { id_imagen } = req.params;
            const img = await ImagenPublicidadRepository.getById(id_imagen);
            if (!img) res.status(404).json({ error: 'Imagen no encontrada.' });

            // Eliminar archivo físico
            const filePath = path.join(__dirname, '../../../../', img.ruta_imagen);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            await ImagenPublicidadRepository.delete(id_imagen);
            res.json({ ok: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    };
}
