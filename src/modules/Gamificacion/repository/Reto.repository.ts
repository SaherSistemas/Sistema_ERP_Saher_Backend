import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Reto from '../model/Reto';
import { calcularPeriodoRef } from '../utils/periodoRef';
import Progreso_Reto from '../model/Progreso_Reto';
import Logro_Empleado from '../model/Logro_Empleado';
import Articulo from '../../Catalogos/Articulos/model/Articulo';
import Categoria_Articulo from '../../Catalogos/Articulos/model/Categoria_Articulo';
import Categoria_Empresa from '../model/Categoria_Empresa';
import Articulo_Categoria_Empresa from '../model/Articulo_Categoria_Empresa';
import Empleado from '../../RRHH/model/Empleado';
import Venta from '../../../models/Venta/Venta';
import CorteCaja from '../../../models/Caja/Corte_Caja';
import Presupuesto_Empleado from '../../../models/Presupuestos/Presupuesto_Empleado';
import Presupuesto_Empresa from '../../../models/Presupuestos/Presupuesto_Empresa';

export const RetoRepository = {

    // ── CRUD Retos ─────────────────────────────────────────────────────────

    getAllPorEmpresa: (id_empresa: string) =>
        Reto.findAll({
            where: { id_empresa },
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic'] },
                { model: Categoria_Articulo, attributes: ['id_categoria', 'nom_categoria'] },
                { model: Categoria_Empresa, attributes: ['id_categoria_empresa', 'nom_categoria_empresa', 'icono'] },
            ],
            order: [['createdAt', 'DESC']],
        }),

    getById: (id_reto: string) =>
        Reto.findByPk(id_reto, {
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic'] },
                { model: Categoria_Articulo, attributes: ['id_categoria', 'nom_categoria'] },
                { model: Categoria_Empresa, attributes: ['id_categoria_empresa', 'nom_categoria_empresa', 'icono'] },
            ],
        }),

    create: (data: {
        nombre_reto: string;
        descripcion_reto?: string;
        tipo_reto: string;
        periodo: string;
        objetivo: number;
        id_articulo?: string | null;
        id_categoria?: string | null;
        id_categoria_empresa?: string | null;
        tipo_objetivo_categoria?: string | null;
        puntos_reto?: number;
        icono_reto?: string;
        id_empresa: string;
    }) => Reto.create({ id_reto: uuidv4(), ...data } as any),

    update: async (id_reto: string, data: Partial<Reto>) => {
        await Reto.update(data as any, { where: { id_reto } });
        return Reto.findByPk(id_reto);
    },

    toggleActivo: async (id_reto: string) => {
        const reto = await Reto.findByPk(id_reto);
        if (!reto) throw new Error('Reto no encontrado');
        reto.activo = !reto.activo;
        return reto.save();
    },

    delete: (id_reto: string) => Reto.destroy({ where: { id_reto } }),

    // ── Progreso ───────────────────────────────────────────────────────────

    getRetosConProgreso: async (id_empleado: string, id_empresa: string, periodo_ref_corte: string, fecha_dia: string) => {
        const retos = await Reto.findAll({
            where: { id_empresa, activo: true },
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic'] },
                { model: Categoria_Articulo, attributes: ['id_categoria', 'nom_categoria'] },
            ],
        });

        const resultados = await Promise.all(retos.map(async (reto) => {
            const periodo_ref = calcularPeriodoRef(reto.periodo, periodo_ref_corte, fecha_dia, (reto as any).fecha_especifica);
            const progreso = await Progreso_Reto.findOne({
                where: { id_reto: reto.id_reto, id_empleado, periodo_ref },
            });
            return {
                ...reto.toJSON(),
                progreso_actual: Number(progreso?.progreso_actual ?? 0),
                completado: progreso?.completado ?? false,
                porcentaje: Math.min(100, Math.round((Number(progreso?.progreso_actual ?? 0) / Number(reto.objetivo)) * 100)),
            };
        }));

        return resultados;
    },

    upsertProgreso: async (
        id_reto: string,
        id_empleado: string,
        periodo_ref: string,
        incremento: number,
        t?: Transaction,
        monto_categoria?: number
    ) => {
        const [prog, created] = await Progreso_Reto.findOrCreate({
            where: { id_reto, id_empleado, periodo_ref },
            defaults: {
                id_progreso: uuidv4(),
                id_reto,
                id_empleado,
                periodo_ref,
                progreso_actual: 0,
                completado: false,
                monto_en_espera: 0,
            } as any,
            transaction: t,
        });

        const reto = await Reto.findByPk(id_reto, { transaction: t });
        const nuevo = Number(prog.progreso_actual) + incremento;
        prog.progreso_actual = nuevo;

        const yaCompletado = prog.completado;
        const ahoraCompleto = reto && nuevo >= Number(reto.objetivo);

        // Acumular monto en espera mientras no esté completado
        if (monto_categoria && monto_categoria > 0 && !yaCompletado) {
            prog.monto_en_espera = Number(prog.monto_en_espera) + monto_categoria;
        }

        if (ahoraCompleto && !yaCompletado) {
            prog.completado = true;
            prog.fecha_completado = new Date();
            // Al completar el reto, las ventas ya fluyen libremente al presupuesto
            prog.monto_en_espera = 0;
        }

        await prog.save({ transaction: t });

        return { progreso: prog, recienCompletado: ahoraCompleto && !yaCompletado, reto };
    },

    registrarLogro: async (id_reto: string, id_empleado: string, puntos: number, periodo_ref: string, t?: Transaction) => {
        const yaExiste = await Logro_Empleado.findOne({ where: { id_reto, id_empleado, periodo_ref }, transaction: t });
        if (yaExiste) return yaExiste;
        return Logro_Empleado.create({
            id_logro: uuidv4(),
            id_reto,
            id_empleado,
            puntos_ganados: puntos,
            periodo_ref,
            fecha_logro: new Date(),
        } as any, { transaction: t });
    },

    getPuntosTotales: (id_empleado: string) =>
        Logro_Empleado.sum('puntos_ganados', { where: { id_empleado } }),

    getHistorialLogros: (id_empleado: string) =>
        Logro_Empleado.findAll({
            where: { id_empleado },
            include: [{ model: Reto, attributes: ['nombre_reto', 'icono_reto', 'tipo_reto'] }],
            order: [['fecha_logro', 'DESC']],
            limit: 50,
        }),

    getEmpleadoPeriodoDetalle: async (
        id_empleado: string,
        id_empresa: string,
        periodo_ref: string,
        tipo_periodo: string
    ) => {
        // ── Auto-detectar tipo real desde el formato del periodo_ref ───────────
        // El reto puede haber cambiado de tipo después de que se guardaron progresos,
        // así que confiamos en el formato del valor, no en tipo_periodo.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const SEMANA_RE = /^\d{4}-W\d{2}$/;
        const QUINCENAL_RE = /^\d{4}-\d{2}-Q[12]$/;
        const MENSUAL_RE = /^\d{4}-\d{2}$/;
        const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

        let tipoEfectivo = tipo_periodo;
        if (UUID_RE.test(periodo_ref)) tipoEfectivo = 'CORTE';
        else if (SEMANA_RE.test(periodo_ref)) tipoEfectivo = 'SEMANA';
        else if (QUINCENAL_RE.test(periodo_ref)) tipoEfectivo = 'QUINCENAL';
        else if (MENSUAL_RE.test(periodo_ref)) tipoEfectivo = 'MENSUAL';
        else if (DIA_RE.test(periodo_ref)) tipoEfectivo = 'DIA';

        // ── Calcular rango de fechas desde el periodo_ref ──────────────────────
        let fechaInicio: Date | null = null;
        let fechaFin: Date | null = null;
        let anioMes: { anio: number; mes: number } | null = null;

        if (tipoEfectivo === 'CORTE') {
            const corte = await CorteCaja.findByPk(periodo_ref, {
                attributes: ['fecha_apertura', 'fecha_cierre'],
            });
            if (corte) {
                fechaInicio = new Date(corte.get('fecha_apertura') as Date);
                const cierre = corte.get('fecha_cierre') as Date | null;
                fechaFin = cierre ? new Date(cierre) : new Date();
                anioMes = { anio: fechaInicio.getFullYear(), mes: fechaInicio.getMonth() + 1 };
            }
        } else if (tipoEfectivo === 'DIA' || tipoEfectivo === 'FECHA_ESPECIFICA') {
            const d = new Date(periodo_ref + 'T00:00:00');
            fechaInicio = d;
            fechaFin = new Date(d.getTime() + 86400000);
            anioMes = { anio: d.getFullYear(), mes: d.getMonth() + 1 };
        } else if (tipoEfectivo === 'SEMANA') {
            // "2026-W30" → lunes al domingo
            const [anio, semStr] = periodo_ref.split('-W');
            const sem = parseInt(semStr);
            const jan4 = new Date(parseInt(anio), 0, 4);
            const dayOfWeek = jan4.getDay() === 0 ? 7 : jan4.getDay();
            const lunes = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000 + (sem - 1) * 7 * 86400000);
            fechaInicio = lunes;
            fechaFin = new Date(lunes.getTime() + 7 * 86400000);
            anioMes = { anio: lunes.getFullYear(), mes: lunes.getMonth() + 1 };
        } else if (tipoEfectivo === 'QUINCENAL') {
            // "2026-07-Q1" o "2026-07-Q2"
            const [anio, mes, q] = periodo_ref.split('-');
            const a = parseInt(anio), m = parseInt(mes);
            if (q === 'Q1') {
                fechaInicio = new Date(a, m - 1, 1);
                fechaFin = new Date(a, m - 1, 16);
            } else {
                fechaInicio = new Date(a, m - 1, 16);
                fechaFin = new Date(a, m, 1);
            }
            anioMes = { anio: a, mes: m };
        } else if (tipoEfectivo === 'MENSUAL') {
            // "2026-07"
            const [anio, mes] = periodo_ref.split('-');
            const a = parseInt(anio), m = parseInt(mes);
            fechaInicio = new Date(a, m - 1, 1);
            fechaFin = new Date(a, m, 1);
            anioMes = { anio: a, mes: m };
        }

        // ── Ventas del empleado en el periodo ─────────────────────────────────
        const ventasWhere: any = {
            id_empleado,
            id_empre: id_empresa,
            status_venta: 'CONFIRMADA',
        };
        if (tipoEfectivo === 'CORTE') {
            ventasWhere.id_corte = periodo_ref;
        } else if (fechaInicio && fechaFin) {
            ventasWhere.createdAt = { [Op.gte]: fechaInicio, [Op.lt]: fechaFin };
        }

        const ventas = await Venta.findAll({
            where: ventasWhere,
            attributes: ['id_venta', 'total_venta', 'createdAt', 'id_corte'],
            order: [['createdAt', 'DESC']],
            limit: 100,
        });

        // ── Presupuesto del empleado ese mes ─────────────────────────────────
        let presupuesto: any = null;
        if (anioMes) {
            const pe = await Presupuesto_Empleado.findOne({
                where: { id_empleado, id_empre: id_empresa },
                include: [{
                    model: Presupuesto_Empresa,
                    where: { anio: anioMes.anio, mes: anioMes.mes },
                    attributes: ['anio', 'mes', 'estado_presupuesto'],
                    required: true,
                }],
            });
            if (pe) {
                presupuesto = {
                    monto_planeado: Number(pe.monto_planeado),
                    anio: anioMes.anio,
                    mes: anioMes.mes,
                };
            }
        }

        const total_ventas = ventas.reduce((s, v) => s + Number(v.total_venta), 0);

        return {
            periodo_ref,
            tipo_periodo,
            fecha_inicio: fechaInicio?.toISOString().split('T')[0] ?? null,
            fecha_fin: fechaFin ? new Date(fechaFin.getTime() - 1).toISOString().split('T')[0] : null,
            presupuesto,
            ventas: ventas.map(v => ({
                id_venta: v.id_venta,
                total_venta: Number(v.total_venta),
                fecha: (v.createdAt as Date).toISOString(),
            })),
            total_ventas,
            num_ventas: ventas.length,
        };
    },

    getHistorialPorReto: async (id_reto: string) => {
        const reto = await Reto.findByPk(id_reto);
        if (!reto) return null;

        const progresos = await Progreso_Reto.findAll({
            where: { id_reto },
            include: [{ model: Empleado, attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'] }],
            order: [['periodo_ref', 'DESC'], ['progreso_actual', 'DESC']],
        });

        return { reto, progresos };
    },
};
