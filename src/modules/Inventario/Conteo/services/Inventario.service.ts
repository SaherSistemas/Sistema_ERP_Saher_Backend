import { Op } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { InventarioRepository } from '../repositories/Inventario.repository';
import { TipoInventario, StatusInventario } from '../model/Inventario';
import Stock_Ubicacion_Lote from '../../Stock/model/Stock_Ubicacion_Lote';
import Lote_Articulo_Sucursal from '../../Lotes/model/Lote_Articulo_Sucursal';
import { LotesArticuloSucursalRepository } from '../../Lotes/repository/Lote_ArticuloSucursal.repository';

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

            // Pasar a EN_CONTEO automáticamente (aunque no haya renglones todavía: p.ej.
            // una ubicación vacía en sistema donde el surtidor va a agregar lo que
            // encuentre físicamente vía "agregarManual").
            await inv.update({ status: 'EN_CONTEO' }, { transaction: tx });

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

    // Agrega un artículo/lote encontrado físicamente que no venía en el conteo
    // generado automáticamente (lote distinto al esperado, o artículo nunca
    // antes registrado en esta ubicación). Si ya existe un renglón para ese
    // mismo artículo+lote en este inventario, actualiza su conteo en vez de
    // duplicarlo.
    agregarManual: async (id_inventario: string, dto: {
        id_articulo: string;
        id_lote?: string | null;
        numero_lote_nuevo?: string;
        fecha_vencimiento_nueva?: string;
        cant_contada: number;
        comentario?: string;
        // Ubicación explícita (p.ej. al corregir el lote de un renglón que ya
        // traía una ubicación concreta). Si no se manda, se usa la del filtro
        // del inventario (caso de un inventario tipo UBICACION completo).
        id_ubicacion_sucursal?: string | null;
    }) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status !== 'EN_CONTEO') throw new Error('El inventario debe estar EN_CONTEO para agregar renglones');
        if (!dto.cant_contada || dto.cant_contada < 0) throw new Error('Cantidad contada inválida');

        const id_ubicacion_sucursal = dto.id_ubicacion_sucursal !== undefined
            ? dto.id_ubicacion_sucursal
            : (inv.filtro as any)?.id_ubicacion_sucursal ?? null;

        let id_lote: string | null = dto.id_lote ?? null;
        if (!id_lote && dto.numero_lote_nuevo?.trim()) {
            if (!dto.fecha_vencimiento_nueva) throw new Error('Fecha de caducidad requerida para un lote nuevo.');
            const lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal({
                id_artic: dto.id_articulo,
                id_empre: inv.id_empresa_sucursal,
                numero_lote_sucursal: dto.numero_lote_nuevo.trim(),
                fecha_venci_lote_sucursal: new Date(dto.fecha_vencimiento_nueva) as any,
                cantidad_entrada_lote: 0,
                precio_costo_lote_sucursal: 0,
                estado_lote_sucursal: 'A',
            } as any);
            id_lote = lote.id_lote_sucursal;
        } else if (id_lote) {
            const loteExistente = await Lote_Articulo_Sucursal.findOne({
                where: { id_lote_sucursal: id_lote, id_artic: dto.id_articulo, id_empre: inv.id_empresa_sucursal },
            });
            if (!loteExistente) throw new Error('El lote indicado no pertenece a este artículo/empresa.');
        }

        const existente = await InventarioRepository.buscarDetalleExistente(id_inventario, dto.id_articulo, id_lote, id_ubicacion_sucursal);
        if (existente) {
            return InventarioRepository.actualizarConteo(existente.id_detalle_inventario, {
                cant_contada: dto.cant_contada,
                comentario: dto.comentario,
            });
        }

        return InventarioRepository.crearDetalleManual({
            id_inventario,
            id_empresa_sucursal: inv.id_empresa_sucursal,
            id_articulo: dto.id_articulo,
            id_ubicacion_sucursal,
            id_lote,
            cant_contada: dto.cant_contada,
            comentario: dto.comentario ?? null,
        });
    },

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

    aplicar: (id_inventario: string, aplicado_por: string, marcarInicial: boolean = false) =>
        InventarioRepository.aplicar(id_inventario, aplicado_por, marcarInicial),

    cancelar: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status === 'APLICADO') throw new Error('No se puede cancelar un inventario ya aplicado');
        await InventarioRepository.cambiarStatus(id_inventario, 'CANCELADO');
        return { ok: true };
    },
};
