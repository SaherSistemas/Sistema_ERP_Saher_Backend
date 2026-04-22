import type { Request, Response } from 'express';
import { PermisoUsuarioRepository } from '../repositories/Permiso_Usuario.repository';

export class PermisoUsuarioController {

    static getByUser = async (req: Request, res: Response) => {
        try {
            const overrides = await PermisoUsuarioRepository.getByUserId(req.params.id_user);
            res.status(200).json(overrides);
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    }

    static bulkSet = async (req: Request, res: Response) => {
        try {
            const { overrides } = req.body as { overrides: { id_permiso: number; tipo_override: string }[] };
            await PermisoUsuarioRepository.bulkSet(req.params.id_user, overrides ?? []);
            res.status(200).json({ mensaje: 'Overrides del usuario actualizados correctamente' });
        } catch (error) {
            res.status(500).json({ mensaje: error.message });
        }
    }
}
