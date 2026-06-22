import { Op } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { InventarioRepository } from '../repositories/Inventario.repository';
import { TipoInventario, StatusInventario } from '../model/Inventario';
import Stock_Ubicacion_Lote from '../../Stock/model/Stock_Ubicacion_Lote';

export const InventarioService = {

    getLista: (id_empresa_sucursal: string, params: {
        status?: StatusInventario;
        tipo?: TipoInventario;
        fecha_inicio?: string;
        fecha_fin?: string;
    }) => InventarioRepository.getLista(id_empresa_sucursal, params),

    getById: (id_inventario: string) => InventarioRepository.getById(id_inventario),

    // Crea encabezado + genera renglones en una sola transacción
    crear: async (data: {
        id_empresa_sucursal: string;
        tipo_inventario: TipoInventario;
        filtro?: { pasillo?: string; id_ubicacion_sucursal?: string; id_articulo?: string; id_articulos?: string[] };
        creado_por?: string;
        notas?: string;
    }) => {
        return dbLocal.transaction(async (tx) => {
            const inv = await InventarioRepository.crearEncabezado({
                id_empresa_sucursal: data.id_empresa_sucursal,
                tipo_inventario: data.tipo_inventario,
                filtro: data.filtro ?? {},
                creado_por: data.creado_por,
                notas: data.notas,
            }, tx);

            const detalles = await InventarioRepository.generarDetalles(
                inv.id_inventario,
                data.id_empresa_sucursal,
                { tipo: data.tipo_inventario, ...data.filtro },
                tx,
            );

            // Pasar a EN_CONTEO automáticamente si hay renglones (dentro de la misma tx)
            if (detalles.length > 0) {
                await inv.update({ status: 'EN_CONTEO' }, { transaction: tx });
            }

            return { inventario: inv, total_renglones: detalles.length };
        });
    },

    crearRandom: async (data: {
        id_empresa_sucursal: string;
        cantidad: number;
        creado_por?: string;
        notas?: string;
    }) => {
        if (data.cantidad < 1) throw new Error('La cantidad debe ser al menos 1');

        // Artículos distintos con stock > 0 en la empresa
        const rows = await Stock_Ubicacion_Lote.findAll({
            where: { id_empresa_sucursal: data.id_empresa_sucursal, cantidad: { [Op.gt]: 0 } },
            attributes: [[dbLocal.fn('DISTINCT', dbLocal.col('id_articulo')), 'id_articulo']],
            raw: true,
        }) as any[];

        if (!rows.length) throw new Error('No hay artículos con stock en esta empresa');

        // Mezclar aleatoriamente y tomar los primeros N
        const todos = rows.map((r: any) => r.id_articulo as string);
        for (let i = todos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [todos[i], todos[j]] = [todos[j], todos[i]];
        }
        const seleccionados = todos.slice(0, Math.min(data.cantidad, todos.length));

        return InventarioService.crear({
            id_empresa_sucursal: data.id_empresa_sucursal,
            tipo_inventario:     'ARTICULO',
            filtro:              { id_articulos: seleccionados },
            creado_por:          data.creado_por,
            notas:               data.notas ?? `Inventario aleatorio — ${seleccionados.length} artículo(s)`,
        });
    },

    actualizarConteo: (id_detalle_inventario: string, data: {
        cant_contada: number;
        comentario?: string;
        ajustar?: boolean;
    }) => InventarioRepository.actualizarConteo(id_detalle_inventario, data),

    // Pasa de BORRADOR → EN_CONTEO manualmente
    iniciar: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status !== 'BORRADOR') throw new Error('Solo se puede iniciar un inventario en BORRADOR');
        await InventarioRepository.cambiarStatus(id_inventario, 'EN_CONTEO');
        return { ok: true };
    },

    // Marca el inventario como TERMINADO (todos los renglones deben estar contados)
    terminar: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status !== 'EN_CONTEO') throw new Error('El inventario debe estar EN_CONTEO para terminar');

        const sinContar = (inv.detalles ?? []).filter(d => !d.contado).length;
        if (sinContar > 0) throw new Error(`Faltan ${sinContar} renglón(es) por contar`);

        await InventarioRepository.cambiarStatus(id_inventario, 'TERMINADO');
        return { ok: true };
    },

    // Terminar forzado aunque haya renglones sin contar (los no contados se ignoran)
    terminarForzado: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        await InventarioRepository.cambiarStatus(id_inventario, 'TERMINADO');
        return { ok: true };
    },

    aplicar: (id_inventario: string, aplicado_por: string) =>
        InventarioRepository.aplicar(id_inventario, aplicado_por),

    cancelar: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status === 'APLICADO') throw new Error('No se puede cancelar un inventario ya aplicado');
        await InventarioRepository.cambiarStatus(id_inventario, 'CANCELADO');
        return { ok: true };
    },
};
