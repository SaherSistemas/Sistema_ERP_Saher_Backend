import type { Request, Response } from "express";
import { PermisoService } from "../services/Permiso.service"
import { ICreateOrUpdatePermiso } from "../interface/Permiso.interface";

export class PermisoController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosPermisos = await PermisoService.getAll();
            res.status(201).json({ mensaje: todosPermisos })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error al obtener todos los permisos" })
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_permiso } = req.params;
            const rol = await PermisoService.getByID(id_permiso)
            res.status(201).json(rol)
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: error.message })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const newPermiso = await PermisoService.create(data)
            res.status(201).json({ mensaje: "Permiso creado correctamente.", rol: newPermiso })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error no se pudo crear el permiso." })
        }
    }
    // POST /permiso/seed-finanzas-cxp
    // Crea los permisos del módulo CxP si no existen
    static seedFinanzasCxP = async (_req: Request, res: Response) => {
        try {
            const nuevos = [
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_dashboard' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_lista' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_detalle' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_registrar_pago' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_pago_multiple' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_generar_historicas' },
                { modulo_permiso: 'finanzas', accion_permiso: 'cxp_saldo_historico_proveedor' },
                { modulo_permiso: 'finanzas', accion_permiso: 'saldo_historico' },
            ];

            const existentes = await PermisoService.getAll();
            const claves = new Set(existentes.map((p: any) => `${p.modulo_permiso}__${p.accion_permiso}`));

            const creados = [];
            for (const p of nuevos) {
                const clave = `${p.modulo_permiso}__${p.accion_permiso}`;
                if (!claves.has(clave)) {
                    const creado = await PermisoService.create(p);
                    creados.push(creado);
                }
            }

            res.status(200).json({
                message: `${creados.length} permisos creados, ${nuevos.length - creados.length} ya existían.`,
                creados,
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al crear permisos.' });
        }
    };

    // POST /permiso/seed-facturacion
    // Crea los permisos del módulo Facturación si no existen
    static seedFacturacion = async (_req: Request, res: Response) => {
        try {
            const nuevos = [
                // Facturación (solo facturas emitidas)
                { modulo_permiso: 'facturacion', accion_permiso: 'menu' },
                { modulo_permiso: 'facturacion', accion_permiso: 'facturas' },
                // CxC y Pagos van en Finanzas
                { modulo_permiso: 'finanzas', accion_permiso: 'cxc' },
                { modulo_permiso: 'finanzas', accion_permiso: 'pagos' },
                // Devoluciones
                { modulo_permiso: 'devoluciones', accion_permiso: 'menu' },
                { modulo_permiso: 'devoluciones', accion_permiso: 'devoluciones_clientes' },
            ];

            const existentes = await PermisoService.getAll();
            const claves = new Set(existentes.map((p: any) => `${p.modulo_permiso}__${p.accion_permiso}`));

            const creados = [];
            for (const p of nuevos) {
                const clave = `${p.modulo_permiso}__${p.accion_permiso}`;
                if (!claves.has(clave)) {
                    const creado = await PermisoService.create(p);
                    creados.push(creado);
                }
            }

            res.status(200).json({
                message: `${creados.length} permisos creados, ${nuevos.length - creados.length} ya existían.`,
                creados,
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al crear permisos.' });
        }
    };

    // POST /permiso/seed-vales
    static seedVales = async (_req: Request, res: Response) => {
        try {
            const nuevos = [
                { modulo_permiso: 'vales', accion_permiso: 'menu' },
                { modulo_permiso: 'vales', accion_permiso: 'vales_crear' },
                { modulo_permiso: 'vales', accion_permiso: 'vales_deuda' },
                { modulo_permiso: 'vales', accion_permiso: 'vales_consolidar' },
            ];

            const existentes = await PermisoService.getAll();
            const claves = new Set(existentes.map((p: any) => `${p.modulo_permiso}__${p.accion_permiso}`));

            const creados = [];
            for (const p of nuevos) {
                const clave = `${p.modulo_permiso}__${p.accion_permiso}`;
                if (!claves.has(clave)) {
                    const creado = await PermisoService.create(p);
                    creados.push(creado);
                }
            }

            res.status(200).json({
                message: `${creados.length} permisos creados, ${nuevos.length - creados.length} ya existían.`,
                creados,
            });
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: error.message ?? 'Error al crear permisos.' });
        }
    };

    static delete = async (req: Request, res: Response) => {
        try {
            await PermisoService.delete(Number(req.params.id_permiso));
            res.status(200).json({ message: 'Permiso eliminado.' });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    };

    static update = async (req: Request, res: Response) => {
        try {
            const { id_permiso } = req.params;
            const data: ICreateOrUpdatePermiso = req.body;
            const update = await PermisoService.update(id_permiso, data)
            res.status(201).json({ mensaje: "Permiso actualizado correctamente", id_permiso: update })
        } catch (error) {
            console.error(error)
            res.status(500).json({ mensaje: "Error no se pudo actualizar el permiso." })
        }
    }

}