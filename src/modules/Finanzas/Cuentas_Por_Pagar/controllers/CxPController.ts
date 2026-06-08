import type { Request, Response } from 'express';
import { CxPService } from '../services/CxP.service';
import { CxPRepository } from '../repositories/CxP.repository';
import { AuthedRequest } from '../../../../middleware/auth';
import { Pago_Grupo_CxP_Repository } from '../repositories/Pago_Grupo_CxP.repository';
import { generarPDFSaldos, generarXLSXSaldos } from '../../helpers/reporte_saldos.helper';

export class CxPController {

    // GET /api/finanzas/cxp/reporte-saldos?fecha_corte=YYYY-MM-DD&formato=pdf|xlsx
    static reporteSaldosProveedores = async (req: Request, res: Response) => {
        try {
            const fecha_corte = (req.query.fecha_corte as string) || new Date().toISOString().slice(0, 10);
            const formato     = (req.query.formato as string) || 'pdf';

            const rows = await CxPRepository.getSaldosGlobalesProveedores(fecha_corte);
            const filas = rows.map(r => ({
                nombre:        r.nombre,
                rfc:           r.rfc,
                num_facturas:  Number(r.num_facturas),
                total_saldo:   Number(r.total_saldo),
                total_vencido: Number(r.total_vencido),
                total_vigente: Number(r.total_vigente),
            }));

            if (formato === 'xlsx') {
                return generarXLSXSaldos(res, 'Saldos con Proveedores', fecha_corte, filas);
            }
            return generarPDFSaldos(res, 'Saldos con Proveedores al Día X', fecha_corte, filas);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al generar reporte.' });
        }
    };

    // GET /api/finanzas/cxp/saldo-historico/:id_prove?fecha_corte=YYYY-MM-DD
    static getSaldoHistoricoProveedor = async (req: Request, res: Response) => {
        try {
            const { id_prove } = req.params;
            const fecha_corte  = (req.query.fecha_corte as string) || new Date().toISOString().slice(0, 10);
            const resultado    = await CxPRepository.getSaldoHistoricoProveedor(id_prove, fecha_corte);
            res.status(200).json(resultado);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error.' });
        }
    };

    // GET /api/finanzas/cxp/dashboard
    static getDashboard = async (_req: Request, res: Response) => {
        try {
            const data = await CxPService.getDashboard();
            res.status(200).json(data);
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al obtener el dashboard.' });
        }
    };

    // GET /api/finanzas/cxp
    static getAll = async (req: Request, res: Response) => {
        try {
            const { id_proveedor, estatus_cxp, fecha_inicio, fecha_fin, vencidas } = req.query as Record<string, string>;
            const cuentas = await CxPService.getAll({
                id_proveedor,
                estatus_cxp,
                fecha_inicio,
                fecha_fin,
                vencidas: vencidas === 'true',
            });
            res.status(200).json({ cuentas });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al obtener las cuentas.' });
        }
    };

    // GET /api/finanzas/cxp/proveedor/:id_proveedor
    static getByProveedor = async (req: Request, res: Response) => {
        try {
            const { id_proveedor } = req.params;
            const cuentas = await CxPService.getByProveedor(id_proveedor);
            res.status(200).json({ cuentas });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error.' });
        }
    };

    // GET /api/finanzas/cxp/:id_cxp
    static getById = async (req: Request, res: Response) => {
        try {
            const cxp = await CxPService.getById(req.params.id_cxp);
            res.status(200).json(cxp);
        } catch (err: any) {
            console.error(err);
            const status = /no encontrada/i.test(err.message) ? 404 : 500;
            res.status(status).json({ message: err.message });
        }
    };

    // POST /api/finanzas/cxp
    static create = async (req: AuthedRequest, res: Response) => {
        try {
            const cxp = await CxPService.create({
                ...req.body,
                id_empleado_registro: req.user?.id_referencia_persona,
            });
            res.status(201).json({ message: 'Cuenta por pagar registrada.', cxp });
        } catch (err: any) {
            console.error(err);
            res.status(400).json({ message: err.message ?? 'Error al crear la cuenta.' });
        }
    };

    // PATCH /api/finanzas/cxp/marcar-vencidas
    static marcarVencidas = async (_req: Request, res: Response) => {
        try {
            await CxPService.marcarVencidas();
            res.status(200).json({ message: 'Cuentas vencidas actualizadas.' });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // POST /api/finanzas/cxp/pago-multiple
    static registrarPagoMultiple = async (req: AuthedRequest, res: Response) => {
        try {
            const id_empleado_captura = req.user?.id_referencia_persona ?? undefined;
            const url_comprobante = (req.file as Express.Multer.File | undefined)?.path ?? undefined;

            const resultado = await Pago_Grupo_CxP_Repository.registrarPagoMultiple({
                ...req.body,
                lineas: typeof req.body.lineas === 'string' ? JSON.parse(req.body.lineas) : req.body.lineas,
                id_empleado_captura,
                url_comprobante,
            });

            res.status(201).json({ message: 'Pago múltiple registrado correctamente.', ...resultado });
        } catch (err: any) {
            console.error(err);
            const status = /no encontrada|pagada|cancelada|excede/i.test(err.message) ? 400 : 500;
            res.status(status).json({ message: err.message ?? 'Error al registrar el pago múltiple.' });
        }
    };

    // GET /api/finanzas/cxp/pago-multiple/:id_pago_grupo
    static getPagoMultiple = async (req: Request, res: Response) => {
        try {
            const grupo = await Pago_Grupo_CxP_Repository.getById(req.params.id_pago_grupo);
            if (!grupo) res.status(404).json({ message: 'Grupo de pago no encontrado.' });
            res.status(200).json(grupo);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // POST /api/finanzas/cxp/generar-desde-facturas
    static generarDesdeFacturas = async (_req: Request, res: Response) => {
        try {
            const resultado = await CxPService.generarCxPDesdeFacturasExistentes();
            console.log(resultado);
            res.status(200).json({
                message: `Proceso completado: ${resultado.creadas} CxP creadas, ${resultado.omitidas} omitidas.`,
                ...resultado,
            });

        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al generar CxP.' });
        }
    };
}
