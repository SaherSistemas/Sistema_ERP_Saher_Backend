import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { CxPService } from '../services/CxP.service';
import { CxPRepository } from '../repositories/CxP.repository';
import { AuthedRequest } from '../../../../middleware/auth';
import { Pago_Grupo_CxP_Repository } from '../repositories/Pago_Grupo_CxP.repository';
import { generarPDFSaldos, generarXLSXSaldos } from '../../helpers/reporte_saldos.helper';
import { Linea_Pago_CxP_Repository } from '../repositories/Linea_Pago_CxP.repository';
import { Grupo_Linea_Pago_Repository } from '../repositories/Grupo_Linea_Pago_CxP.repository';
import Pago_CxP from '../model/Pago_CxP.model';

export class CxPController {

    // GET /api/finanzas/cxp/reporte-saldos?fecha_corte=YYYY-MM-DD&formato=pdf|xlsx
    static reporteSaldosProveedores = async (req: Request, res: Response) => {
        try {
            const fecha_corte = (req.query.fecha_corte as string) || new Date().toISOString().slice(0, 10);
            const formato = (req.query.formato as string) || 'pdf';

            const rows = await CxPRepository.getSaldosGlobalesProveedores(fecha_corte);
            const filas = rows.map(r => ({
                nombre: r.nombre,
                rfc: r.rfc,
                num_facturas: Number(r.num_facturas),
                total_saldo: Number(r.total_saldo),
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
            const fecha_corte = (req.query.fecha_corte as string) || new Date().toISOString().slice(0, 10);
            const resultado = await CxPRepository.getSaldoHistoricoProveedor(id_prove, fecha_corte);
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

    // POST /api/finanzas/cxp/lineas-pago  — crea una línea de pago (pre-autorización)
    static crearLineaPago = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_cxp, id_proveedor, monto, fecha_pago, id_forma_pago, referencia, notas } = req.body;
            if (!id_cxp || !id_proveedor || !monto || !fecha_pago) {
                res.status(400).json({ message: 'Faltan campos requeridos: id_cxp, id_proveedor, monto, fecha_pago.' });
                return;
            }

            // Validar que el monto no supere el saldo pendiente
            const cxp = await CxPRepository.getById(id_cxp);
            if (!cxp) { res.status(404).json({ message: 'CxP no encontrada.' }); return; }
            if (Number(monto) > Number(cxp.saldo_pendiente)) {
                res.status(400).json({ message: `El monto ($${monto}) supera el saldo pendiente ($${cxp.saldo_pendiente}).` });
                return;
            }

            const linea = await Linea_Pago_CxP_Repository.create({
                id_cxp,
                id_proveedor,
                monto: Number(monto),
                fecha_pago,
                id_forma_pago: id_forma_pago ?? null,
                referencia: referencia ?? null,
                notas: notas ?? null,
                id_empleado_genera: req.user?.id_referencia_persona ?? null,
            });
            res.status(201).json({ message: 'Línea de pago generada.', linea });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al crear la línea de pago.' });
        }
    };

    // GET /api/finanzas/cxp/lineas-pago/pendientes/:id_cxp
    static getLineasPendientes = async (req: Request, res: Response) => {
        try {
            const { id_cxp } = req.params;
            const lineas = await Linea_Pago_CxP_Repository.getLineasPendientesByCxP(id_cxp);
            res.status(200).json(lineas);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // GET /api/finanzas/cxp/lineas-pago/todas  — todas las líneas pendientes (vista global)
    static getTodasLineasPendientes = async (req: Request, res: Response) => {
        try {
            const { id_proveedor } = req.query;
            const lineas = await Linea_Pago_CxP_Repository.getAllPendientes({
                id_proveedor: id_proveedor as string | undefined,
            });
            res.status(200).json(lineas);
        } catch (err: any) {
            console.log(err)
            res.status(500).json({ message: err.message });
        }
    };

    // PATCH /api/finanzas/cxp/lineas-pago/:id_linea/registrar — convierte línea en pago real
    static registrarDesdeLínea = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_linea } = req.params;
            const linea = await Linea_Pago_CxP_Repository.getById(id_linea);
            if (!linea) { res.status(404).json({ message: 'Línea de pago no encontrada.' }); return; }
            if (linea.estado !== 'PEN') { res.status(400).json({ message: 'Esta línea ya fue registrada o cancelada.' }); return; }

            const id_empleado_captura = req.user?.id_referencia_persona ?? undefined;
            const url_comprobante = (req.file as Express.Multer.File | undefined)?.path ?? undefined;

            const resultado = await Pago_Grupo_CxP_Repository.registrarPagoMultiple({
                fecha_pago: linea.fecha_pago.toString().slice(0, 10),
                id_forma_pago: linea.id_forma_pago ?? undefined,
                referencia_pago: linea.referencia ?? undefined,
                notas: linea.notas ?? undefined,
                id_empleado_captura,
                url_comprobante,
                lineas: [{ id_cxp: linea.id_cxp, monto_pago: Number(linea.monto) }],
            });

            await Linea_Pago_CxP_Repository.marcarRegistrada(id_linea, url_comprobante);

            res.status(201).json({ message: 'Pago registrado correctamente.', ...resultado });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al registrar el pago.' });
        }
    };

    // PATCH /api/finanzas/cxp/lineas-pago/:id_linea/cancelar
    static getLineasRegistradasMes = async (_req: Request, res: Response) => {
        try {
            const lineas = await Linea_Pago_CxP_Repository.getRegistradosMes();
            res.status(200).json(lineas);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    static getGruposRegistradosMes = async (_req: Request, res: Response) => {
        try {
            const grupos = await Grupo_Linea_Pago_Repository.getRegistradosMes();
            res.status(200).json(grupos);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    static cancelarLinea = async (req: Request, res: Response) => {
        try {
            const { id_linea } = req.params;
            await Linea_Pago_CxP_Repository.marcarCancelada(id_linea);
            res.status(200).json({ message: 'Línea cancelada.' });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // POST /api/finanzas/cxp/grupos-linea  — crea grupo de líneas de pago (múltiples facturas)
    static crearGrupoLineaPago = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_proveedor, fecha_pago, id_forma_pago, referencia, notas, lineas } = req.body;
            if (!id_proveedor || !fecha_pago || !lineas || !Array.isArray(lineas) || lineas.length === 0) {
                res.status(400).json({ message: 'Faltan campos requeridos: id_proveedor, fecha_pago, lineas.' });
                return;
            }
            // Validar que cada monto no exceda el saldo
            for (const l of lineas) {
                const cxp = await CxPRepository.getById(l.id_cxp);
                if (!cxp) { res.status(404).json({ message: `CxP ${l.id_cxp} no encontrada.` }); return; }
                if (Number(l.monto) > Number(cxp.saldo_pendiente)) {
                    res.status(400).json({ message: `Monto para factura ${cxp.folio_factura} excede el saldo pendiente.` });
                    return;
                }
            }
            const grupo = await Grupo_Linea_Pago_Repository.crear({
                id_proveedor,
                fecha_pago,
                id_forma_pago: id_forma_pago ?? null,
                referencia:    referencia    ?? null,
                notas:         notas         ?? null,
                id_empleado_genera: req.user?.id_referencia_persona ?? null,
                lineas,
            });
            const grupoPoblado = await Grupo_Linea_Pago_Repository.getById(grupo.id_grupo);
            res.status(201).json({ message: 'Grupo de líneas de pago generado.', grupo: grupoPoblado });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al crear el grupo.' });
        }
    };

    // GET /api/finanzas/cxp/grupos-linea/todos
    static getGruposLinea = async (req: Request, res: Response) => {
        try {
            const { id_proveedor } = req.query;
            const grupos = await Grupo_Linea_Pago_Repository.getAllPendientes({
                id_proveedor: id_proveedor as string | undefined,
            });
            res.status(200).json(grupos);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // PATCH /api/finanzas/cxp/grupos-linea/:id_grupo/registrar
    static registrarGrupoLinea = async (req: AuthedRequest, res: Response) => {
        try {
            const { id_grupo } = req.params;
            const grupo = await Grupo_Linea_Pago_Repository.getById(id_grupo);
            if (!grupo) { res.status(404).json({ message: 'Grupo no encontrado.' }); return; }
            if (grupo.estado !== 'PEN') { res.status(400).json({ message: 'Este grupo ya fue registrado o cancelado.' }); return; }

            const id_empleado_captura = req.user?.id_referencia_persona ?? undefined;
            const url_comprobante     = (req.file as Express.Multer.File | undefined)?.path ?? undefined;

            // Registrar un pago por cada detalle
            const lineas = grupo.detalles.map((d: any) => ({ id_cxp: d.id_cxp, monto_pago: Number(d.monto) }));
            await Pago_Grupo_CxP_Repository.registrarPagoMultiple({
                fecha_pago:      grupo.fecha_pago.toString().slice(0, 10),
                id_forma_pago:   grupo.id_forma_pago   ?? undefined,
                referencia_pago: grupo.referencia       ?? undefined,
                notas:           grupo.notas            ?? undefined,
                id_empleado_captura,
                url_comprobante,
                lineas,
            });
            await Grupo_Linea_Pago_Repository.marcarRegistrado(id_grupo, url_comprobante);
            res.status(200).json({ message: 'Grupo registrado y pagos aplicados.' });
        } catch (err: any) {
            console.error(err);
            res.status(500).json({ message: err.message ?? 'Error al registrar el grupo.' });
        }
    };

    // GET /api/finanzas/cxp/grupos-linea/por-cxp/:id_cxp
    static getGruposPorCxP = async (req: Request, res: Response) => {
        try {
            const grupos = await Grupo_Linea_Pago_Repository.getGruposPorCxP(req.params.id_cxp);
            res.status(200).json(grupos);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // PATCH /api/finanzas/cxp/grupos-linea/:id_grupo/cancelar
    static cancelarGrupoLinea = async (req: Request, res: Response) => {
        try {
            await Grupo_Linea_Pago_Repository.marcarCancelado(req.params.id_grupo);
            res.status(200).json({ message: 'Grupo cancelado.' });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // GET /api/finanzas/cxp/comprobante/:id_pago_cxp
    static getComprobante = async (req: Request, res: Response) => {
        try {
            const pago = await Pago_CxP.findByPk(req.params.id_pago_cxp, { attributes: ['url_comprobante'] });
            if (!pago || !pago.url_comprobante) {
                res.status(404).json({ message: 'Comprobante no encontrado.' });
                return;
            }
            const filePath = path.resolve(pago.url_comprobante);
            if (!fs.existsSync(filePath)) {
                res.status(404).json({ message: 'Archivo no encontrado en el servidor.' });
                return;
            }
            res.sendFile(filePath);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // GET /api/finanzas/cxp/lineas-pago/:id_linea/comprobante
    static getComprobanteLinea = async (req: Request, res: Response) => {
        try {
            const linea = await Linea_Pago_CxP_Repository.getById(req.params.id_linea);
            if (!linea || !linea.url_comprobante) {
                res.status(404).json({ message: 'Comprobante no encontrado.' }); return;
            }
            const filePath = path.resolve(linea.url_comprobante);
            if (!fs.existsSync(filePath)) {
                res.status(404).json({ message: 'Archivo no encontrado en el servidor.' }); return;
            }
            res.sendFile(filePath);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    };

    // GET /api/finanzas/cxp/grupos-linea/:id_grupo/comprobante
    static getComprobanteGrupo = async (req: Request, res: Response) => {
        try {
            const grupo = await Grupo_Linea_Pago_Repository.getById(req.params.id_grupo);
            if (!grupo || !grupo.url_comprobante) {
                res.status(404).json({ message: 'Comprobante no encontrado.' }); return;
            }
            const filePath = path.resolve(grupo.url_comprobante);
            if (!fs.existsSync(filePath)) {
                res.status(404).json({ message: 'Archivo no encontrado en el servidor.' }); return;
            }
            res.sendFile(filePath);
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
