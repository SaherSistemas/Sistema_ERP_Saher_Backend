import { Op } from 'sequelize';
import Inventario, { StatusInventario, TipoInventario } from '../model/Inventario';
import Detalle_Inventario from '../model/Detalle_Inventario';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Ubicacion_Sucursal from '../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal';
import LoteArticuloSucursal from '../../Lotes/model/Lote_Articulo_Sucursal';
import Stock_Ubicacion_Lote from '../../Stock/model/Stock_Ubicacion_Lote';
import { dbLocal } from '../../../../config/db';
import { Transaction } from 'sequelize';

export const InventarioRepository = {

    // ── Lista paginada ────────────────────────────────────────────────────────
    getLista: async (id_empresa_sucursal: string, params: {
        status?: StatusInventario;
        tipo?: TipoInventario;
        fecha_inicio?: string;
        fecha_fin?: string;
    }) => {
        const where: any = { id_empresa_sucursal };
        if (params.status) where.status = params.status;
        if (params.tipo) where.tipo_inventario = params.tipo;
        if (params.fecha_inicio || params.fecha_fin) {
            where.createdAt = {};
            if (params.fecha_inicio) where.createdAt[Op.gte] = new Date(params.fecha_inicio);
            if (params.fecha_fin) {
                const fin = new Date(params.fecha_fin);
                fin.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = fin;
            }
        }
        return Inventario.findAll({
            where,
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['filtro'] },
        });
    },

    // ── Detalle completo de un inventario ─────────────────────────────────────
    getById: async (id_inventario: string) =>
        Inventario.findByPk(id_inventario, {
            include: [{
                model: Detalle_Inventario,
                include: [
                    { model: Articulo, attributes: ['id_artic', 'des_artic', 'cod_barr_artic', 'cod_int_artic'] },
                    { model: Ubicacion_Sucursal, attributes: ['id_ubicacion_sucursal', 'pasillo_ub', 'anaquel_ub', 'nivel_ub', 'posicion_ub'] },
                    { model: LoteArticuloSucursal, attributes: ['id_lote_sucursal', 'numero_lote_sucursal', 'fecha_venci_lote_sucursal'] },
                ],
            }],
        }),

    // ── Crear encabezado ──────────────────────────────────────────────────────
    crearEncabezado: async (data: {
        id_empresa_sucursal: string;
        tipo_inventario: TipoInventario;
        filtro?: object;
        creado_por?: string;
        notas?: string;
    }, tx: Transaction) =>
        Inventario.create({
            id_empresa_sucursal: data.id_empresa_sucursal,
            tipo_inventario: data.tipo_inventario,
            status: 'BORRADOR',
            filtro: data.filtro ?? null,
            creado_por: data.creado_por ?? null,
            notas: data.notas ?? null,
        }, { transaction: tx }),

    // ── Generar renglones desde stock actual ──────────────────────────────────
    generarDetalles: async (
        id_inventario: string,
        id_empresa_sucursal: string,
        filtro: {
            tipo: TipoInventario;
            pasillo?: string;
            id_ubicacion_sucursal?: string;
            id_articulo?: string;
            id_articulos?: string[];
        },
        tx: Transaction,
    ) => {
        // Construir where para stock
        const whereStock: any = { id_empresa_sucursal };
        const whereUbicacion: any = {};

        if (filtro.tipo === 'UBICACION' && filtro.id_ubicacion_sucursal) {
            whereStock.id_ubicacion_sucursal = filtro.id_ubicacion_sucursal;
        }
        if (filtro.tipo === 'PASILLO' && filtro.pasillo) {
            whereUbicacion.pasillo_ub = filtro.pasillo;
        }
        if (filtro.tipo === 'ARTICULO') {
            const ids = filtro.id_articulos?.length ? filtro.id_articulos
                      : filtro.id_articulo        ? [filtro.id_articulo]
                      : null;
            if (ids) whereStock.id_articulo = { [Op.in]: ids };
        }

        const rows = await Stock_Ubicacion_Lote.findAll({
            where: whereStock,
            include: [
                {
                    model: Ubicacion_Sucursal,
                    required: filtro.tipo === 'PASILLO',
                    where: Object.keys(whereUbicacion).length ? whereUbicacion : undefined,
                    attributes: ['id_ubicacion_sucursal'],
                },
            ],
            attributes: ['id_articulo', 'id_ubicacion_sucursal', 'id_lote', 'cantidad'],
            transaction: tx,
        }) as any[];

        console.log(rows)
        if (!rows.length) return [];

        const detalles = rows.map(r => ({
            id_inventario,
            id_articulo: r.id_articulo,
            id_ubicacion_sucursal: r.id_ubicacion_sucursal ?? null,
            id_lote: r.id_lote ?? null,
            cant_sistema: Number(r.cantidad) || 0,
            cant_contada: null,
            contado: false,
            ajustar: true,
            ajustado: false,
        }));

        return Detalle_Inventario.bulkCreate(detalles, { transaction: tx });
    },

    // ── Actualizar conteo de un renglón ───────────────────────────────────────
    actualizarConteo: async (id_detalle_inventario: string, data: {
        cant_contada: number;
        comentario?: string;
        ajustar?: boolean;
    }) => {
        await Detalle_Inventario.update(
            {
                cant_contada: data.cant_contada,
                contado: true,
                comentario: data.comentario ?? null,
                ajustar: data.ajustar ?? true,
            },
            { where: { id_detalle_inventario } },
        );
        return Detalle_Inventario.findByPk(id_detalle_inventario);
    },

    // ── Cambiar status ────────────────────────────────────────────────────────
    cambiarStatus: async (id_inventario: string, status: StatusInventario, extra?: Partial<Inventario>) =>
        Inventario.update(
            { status, ...extra },
            { where: { id_inventario } },
        ),

    // ── Aplicar ajustes al stock ──────────────────────────────────────────────
    aplicar: async (id_inventario: string, aplicado_por: string) => {
        return dbLocal.transaction(async (tx) => {
            const inv = await Inventario.findByPk(id_inventario, { transaction: tx });
            if (!inv) throw new Error('Inventario no encontrado');
            if (inv.status !== 'TERMINADO') throw new Error('El inventario debe estar en status TERMINADO para aplicar');

            const detalles = await Detalle_Inventario.findAll({
                where: { id_inventario, ajustar: true, contado: true, ajustado: false },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });

            for (const d of detalles) {
                const diferencia = Number(d.cant_contada) - Number(d.cant_sistema);
                if (diferencia === 0) { await d.update({ ajustado: true }, { transaction: tx }); continue; }

                // Ajustar la fila de stock correspondiente (misma ubicacion + lote)
                const where: any = { id_empresa_sucursal: inv.id_empresa_sucursal, id_articulo: d.id_articulo };
                if (d.id_ubicacion_sucursal) where.id_ubicacion_sucursal = d.id_ubicacion_sucursal;
                if (d.id_lote) where.id_lote = d.id_lote;

                const stock = await Stock_Ubicacion_Lote.findOne({ where, transaction: tx, lock: tx.LOCK.UPDATE });
                if (stock) {
                    const nuevaCant = Math.max(0, Number(stock.cantidad) + diferencia);
                    await stock.update({ cantidad: nuevaCant }, { transaction: tx });
                }
                await d.update({ ajustado: true }, { transaction: tx });
            }

            await inv.update({
                status: 'APLICADO',
                fecha_aplicacion: new Date(),
                aplicado_por,
            }, { transaction: tx });

            return inv;
        });
    },
};
