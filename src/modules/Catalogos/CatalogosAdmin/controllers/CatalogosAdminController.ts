import type { Request, Response } from 'express';
import { CatalogosAdminService } from '../services/CatalogosAdmin.service';

// Solo administradores (prioridad 1 o 2), igual que las demás pantallas de administración
const esAdmin = (req: Request) => {
    const prioridad = (req as any).user?.prioridad;
    return prioridad != null && Number(prioridad) <= 2;
};

const responder = async (req: Request, res: Response, fn: () => Promise<any>, estadoOk = 200) => {
    if (!esAdmin(req)) { res.status(403).json({ message: 'Solo un administrador puede administrar los catálogos.' }); return; }
    try {
        res.status(estadoOk).json(await fn());
    } catch (e: any) {
        res.status(e?.status ?? 500).json({ message: e?.message ?? 'Error en el catálogo.' });
    }
};

export class CatalogosAdminController {
    // GET /catalogos-admin → catálogos y cuántos renglones tiene cada uno
    static catalogos = (req: Request, res: Response) => responder(req, res, () => CatalogosAdminService.listarCatalogos());

    // GET /catalogos-admin/:tabla?q=&page=&limit= → renglones con su estructura
    static listar = (req: Request, res: Response) => responder(req, res, () => CatalogosAdminService.listar(req.params.tabla, {
        q: String(req.query.q ?? ''), page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 50,
    }));

    // POST /catalogos-admin/:tabla  { datos }
    static crear = (req: Request, res: Response) => responder(req, res, () => CatalogosAdminService.crear(req.params.tabla, req.body?.datos ?? {}), 201);

    // POST /catalogos-admin/:tabla/actualizar  { pk, datos }
    static actualizar = (req: Request, res: Response) => responder(req, res, () => CatalogosAdminService.actualizar(req.params.tabla, req.body?.pk ?? {}, req.body?.datos ?? {}));

    // POST /catalogos-admin/:tabla/eliminar  { pk }
    static eliminar = (req: Request, res: Response) => responder(req, res, () => CatalogosAdminService.eliminar(req.params.tabla, req.body?.pk ?? {}));
}
