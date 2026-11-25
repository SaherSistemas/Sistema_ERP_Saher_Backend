import { Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { CuadreExistenciasService } from '../services/CuadreExistencias.service';
import { CuadreCorteService } from '../services/CuadreCorte.service';

const ctx = (req: AuthedRequest) => ({
    id_empresa: String(req.user?.id_empresa || '').trim(),
    id_empleado: String(req.user?.id_referencia_persona || '').trim(),
});

export const CuadreExistenciasController = {

    // GET /almacen/cuadre?refrescar=1 — resumen del cuadre + lotes que no cuadran + avisos + tendencia
    getResumen: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreExistenciasService.getResumen(id_empresa, req.query.refrescar === '1'));
        } catch (e: any) {
            console.error('[Cuadre.getResumen]', e);
            res.status(500).json({ message: e.message ?? 'No se pudo calcular el cuadre.' });
        }
    },

    // GET /almacen/cuadre/lote/:id_lote — qué explica el número de un lote
    getLote: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreExistenciasService.getLote(id_empresa, String(req.params.id_lote)));
        } catch (e: any) {
            console.error('[Cuadre.getLote]', e);
            res.status(400).json({ message: e.message ?? 'No se pudo consultar el lote.' });
        }
    },

    // POST /almacen/cuadre/alertas/:id_alerta/atender
    atenderAlerta: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreExistenciasService.atenderAlerta(id_empresa, String(req.params.id_alerta), id_empleado || null));
        } catch (e: any) {
            console.error('[Cuadre.atenderAlerta]', e);
            res.status(400).json({ message: e.message ?? 'No se pudo marcar el aviso.' });
        }
    },

    // POST /almacen/cuadre/cortes — { nombre, notas } toma una foto de la existencia actual de todos los lotes
    crearCorte: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa, id_empleado } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(201).json(await CuadreCorteService.crear(id_empresa, id_empleado || null, String(req.body?.nombre ?? ''), req.body?.notas ? String(req.body.notas) : null));
        } catch (e: any) {
            console.error('[Cuadre.crearCorte]', e);
            res.status(500).json({ message: e.message ?? 'No se pudo crear el corte.' });
        }
    },

    // GET /almacen/cuadre/cortes
    listarCortes: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreCorteService.listar(id_empresa));
        } catch (e: any) {
            console.error('[Cuadre.listarCortes]', e);
            res.status(500).json({ message: e.message ?? 'No se pudieron consultar los cortes.' });
        }
    },

    // GET /almacen/cuadre/cortes/:id_corte — compara la existencia de hoy contra el corte + movimientos posteriores
    compararCorte: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreCorteService.comparar(id_empresa, String(req.params.id_corte)));
        } catch (e: any) {
            console.error('[Cuadre.compararCorte]', e);
            res.status(400).json({ message: e.message ?? 'No se pudo comparar el corte.' });
        }
    },

    // DELETE /almacen/cuadre/cortes/:id_corte
    eliminarCorte: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            res.status(200).json(await CuadreCorteService.eliminar(id_empresa, String(req.params.id_corte)));
        } catch (e: any) {
            console.error('[Cuadre.eliminarCorte]', e);
            res.status(400).json({ message: e.message ?? 'No se pudo eliminar el corte.' });
        }
    },

    // GET /almacen/cuadre/cortes/:id_corte/excel
    excelCorte: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const buf = await CuadreCorteService.generarExcel(id_empresa, String(req.params.id_corte));
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Fugas_vs_corte_${new Date().toISOString().slice(0, 10)}.xlsx"`);
            res.status(200).send(buf);
        } catch (e: any) {
            console.error('[Cuadre.excelCorte]', e);
            res.status(400).json({ message: e.message ?? 'No se pudo generar el Excel.' });
        }
    },

    // GET /almacen/cuadre/excel
    getExcel: async (req: AuthedRequest, res: Response) => {
        try {
            const { id_empresa } = ctx(req);
            if (!id_empresa) { res.status(400).json({ message: 'No se pudo identificar la empresa del usuario.' }); return; }
            const buf = await CuadreExistenciasService.generarExcel(id_empresa);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Cuadre_existencias_${new Date().toISOString().slice(0, 10)}.xlsx"`);
            res.status(200).send(buf);
        } catch (e: any) {
            console.error('[Cuadre.getExcel]', e);
            res.status(500).json({ message: e.message ?? 'No se pudo generar el Excel.' });
        }
    },
};
