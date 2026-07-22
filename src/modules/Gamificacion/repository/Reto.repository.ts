import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Reto from '../model/Reto';
import Progreso_Reto from '../model/Progreso_Reto';
import Logro_Empleado from '../model/Logro_Empleado';
import Articulo from '../../Catalogos/Articulos/model/Articulo';
import Categoria_Articulo from '../../Catalogos/Articulos/model/Categoria_Articulo';

export const RetoRepository = {

    // ── CRUD Retos ─────────────────────────────────────────────────────────

    getAllPorEmpresa: (id_empresa: string) =>
        Reto.findAll({
            where: { id_empresa },
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_int_artic'] },
                { model: Categoria_Articulo, attributes: ['id_categoria', 'nom_categoria'] },
            ],
            order: [['createdAt', 'DESC']],
        }),

    getById: (id_reto: string) =>
        Reto.findByPk(id_reto, {
            include: [
                { model: Articulo, attributes: ['id_artic', 'des_artic'] },
                { model: Categoria_Articulo, attributes: ['id_categoria', 'nom_categoria'] },
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
            const periodo_ref = reto.periodo === 'CORTE' ? periodo_ref_corte : fecha_dia;
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
        t?: Transaction
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
            } as any,
            transaction: t,
        });

        const reto = await Reto.findByPk(id_reto, { transaction: t });
        const nuevo = Number(prog.progreso_actual) + incremento;
        prog.progreso_actual = nuevo;

        const yaCompletado = prog.completado;
        const ahoraCompleto = reto && nuevo >= Number(reto.objetivo);

        if (ahoraCompleto && !yaCompletado) {
            prog.completado = true;
            prog.fecha_completado = new Date();
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
};
