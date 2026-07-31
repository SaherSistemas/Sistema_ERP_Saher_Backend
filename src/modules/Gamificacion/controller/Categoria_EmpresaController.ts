import type { Request, Response } from 'express';
import { CategoriaEmpresaRepository } from '../repository/Categoria_Empresa.repository';

export const Categoria_EmpresaController = {

    getAll: async (req: Request, res: Response) => {
        try {
            const { id_empre } = req.params;
            const data = await CategoriaEmpresaRepository.getAll(id_empre);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al obtener categorías empresa', error: e }); }
    },

    getById: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await CategoriaEmpresaRepository.getById(id);
            if (!data) { res.status(404).json({ message: 'No encontrado' }); return; }
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error', error: e }); }
    },

    create: async (req: Request, res: Response) => {
        try {
            const data = await CategoriaEmpresaRepository.create(req.body);
            res.status(201).json(data);
        } catch (e) { res.status(500).json({ message: 'Error al crear categoría empresa', error: e }); }
    },

    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await CategoriaEmpresaRepository.update(id, req.body);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al actualizar', error: e }); }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await CategoriaEmpresaRepository.delete(id);
            res.json({ message: 'Eliminado' });
        } catch (e) { res.status(500).json({ message: 'Error al eliminar', error: e }); }
    },

    // ── Artículos ────────────────────────────────────────────────────────────

    getArticulos: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const data = await CategoriaEmpresaRepository.getArticulos(id);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al obtener artículos', error: e }); }
    },

    asignarArticulo: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { id_artic } = req.body;
            const data = await CategoriaEmpresaRepository.asignarArticulo(id, id_artic);
            res.status(201).json(data);
        } catch (e) { res.status(500).json({ message: 'Error al asignar artículo', error: e }); }
    },

    desasignarArticulo: async (req: Request, res: Response) => {
        try {
            const { id, id_artic } = req.params;
            await CategoriaEmpresaRepository.desasignarArticulo(id, id_artic);
            res.json({ message: 'Artículo removido de la categoría' });
        } catch (e) { res.status(500).json({ message: 'Error al desasignar artículo', error: e }); }
    },

    sincronizarArticulos: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { ids_artic } = req.body; // array de UUIDs
            const data = await CategoriaEmpresaRepository.sincronizarArticulos(id, ids_artic);
            res.json(data);
        } catch (e) { res.status(500).json({ message: 'Error al sincronizar artículos', error: e }); }
    },
};
