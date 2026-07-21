import { Request, Response } from 'express';
import { Margen_Especial_ArticuloService } from '../services/Margen_Especial_Articulo.service';

export class Margen_Especial_ArticuloController {

    // GET /margen_especial_articulo
    static getAll = async (req: Request, res: Response) => {
        try {
            const data = await Margen_Especial_ArticuloService.getAll();
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error?.message ?? 'Error al obtener márgenes especiales' });
        }
    };

    // GET /margen_especial_articulo/articulo/:id_articulo
    static getByArticulo = async (req: Request, res: Response) => {
        try {
            const { id_articulo } = req.params;
            const data = await Margen_Especial_ArticuloService.getByArticulo(id_articulo);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ message: error?.message ?? 'Error al obtener márgenes del artículo' });
        }
    };

    // POST /margen_especial_articulo
    static create = async (req: Request, res: Response) => {
        try {
            const { id_lista_precio, id_articulo, margen, fecha_vencimiento_margen } = req.body;
            if (!id_lista_precio || !id_articulo || margen == null) {
                res.status(400).json({ message: 'id_lista_precio, id_articulo y margen son requeridos' });
                return;
            }
            const data = await Margen_Especial_ArticuloService.create({
                id_lista_precio,
                id_articulo,
                margen: Number(margen),
                fecha_vencimiento_margen: fecha_vencimiento_margen ?? null,
            });
            res.status(201).json(data);
        } catch (error: any) {
            const status = /ya existe/i.test(error.message) ? 409 : 500;
            res.status(status).json({ message: error?.message ?? 'Error al crear margen especial' });
        }
    };

    // PUT /margen_especial_articulo/:id
    static update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { margen, fecha_vencimiento_margen } = req.body;
            const data = await Margen_Especial_ArticuloService.update(id, {
                margen: margen != null ? Number(margen) : undefined,
                fecha_vencimiento_margen: fecha_vencimiento_margen ?? null,
            });
            res.json(data);
        } catch (error: any) {
            const status = /no encontrado/i.test(error.message) ? 404 : 500;
            res.status(status).json({ message: error?.message ?? 'Error al actualizar margen especial' });
        }
    };

    // DELETE /margen_especial_articulo/:id
    static delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await Margen_Especial_ArticuloService.delete(id);
            res.json({ message: 'Margen especial eliminado' });
        } catch (error: any) {
            const status = /no encontrado/i.test(error.message) ? 404 : 500;
            res.status(status).json({ message: error?.message ?? 'Error al eliminar margen especial' });
        }
    };
}
