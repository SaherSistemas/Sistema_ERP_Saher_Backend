import { dbLocal } from "../../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";
import { Articulo_Ubicacion_DefaultRepository } from "./Articulo_Ubicacion_Default.repository";


export const Articulo_Ubicacion_DefaultServices = {

    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {
        const rows = await Articulo_Ubicacion_DefaultRepository.getByIDArticulo(id_empresa_sucursal, id_articulo);

        const defaults = Array.isArray(rows)
            ? rows.map(r => (r.get ? r.get({ plain: true }) : r))
            : [];

        // DTO final
        return defaults.map(x => ({
            id_articulo_ubicacion_default: x.id_articulo_ubicacion_default,
            ubicacion_sucursal: x.ubicacion_sucursal
                ? {
                    id_ubicacion_sucursal: x.ubicacion_sucursal.id_ubicacion_sucursal,
                    tipo_ubicacion: x.ubicacion_sucursal.tipo_ubicacion,
                    tarima_ub: x.ubicacion_sucursal.tarima_ub ?? null,
                    pasillo_ub: x.ubicacion_sucursal.pasillo_ub ?? null,
                    anaquel_ub: x.ubicacion_sucursal.anaquel_ub ?? null,
                    nivel_ub: x.ubicacion_sucursal.nivel_ub ?? null,
                    posicion_ub: x.ubicacion_sucursal.posicion_ub ?? null,
                }
                : null,
        }));
    },
    actualizarOCrearDefaultArticulOUbicacion: async (id_empresa_sucursal: string, id_articulo: string, id_ubicacion_sucursal: string) => {
        return await dbLocal.transaction(async (t) => {
            // Una ubicación de anaquel/estantería solo puede ser default de UN artículo a la vez.
            // Una TARIMA sí puede tener varios artículos encima físicamente, así que ahí no se bloquea.
            const existenteEnDestino = await Articulo_Ubicacion_DefaultRepository.findByUbicacion(id_empresa_sucursal, id_ubicacion_sucursal, t);
            if (existenteEnDestino && existenteEnDestino.id_articulo !== id_articulo) {
                const tipoUbicacion = await Articulo_Ubicacion_DefaultRepository.getTipoUbicacion(id_ubicacion_sucursal, t);
                if (tipoUbicacion !== 'TARIMA') {
                    const otroArticulo = (existenteEnDestino as any).articulo;
                    const nombre = otroArticulo ? `${otroArticulo.cod_int_artic} - ${otroArticulo.des_artic}` : 'otro artículo';
                    throw new Error(`Esta ubicación ya es default de ${nombre}. Quítasela primero antes de asignarla aquí.`);
                }
            }

            // Un artículo solo debe tener UNA ubicación default: si ya tenía otra (o, por datos
            // viejos, varias), se MUEVE la primera al destino nuevo y se borran las demás, en vez
            // de acumular una fila más (eso era el bug: nunca se actualizaba, solo se creaba).
            const propiasDelArticulo = await Articulo_Ubicacion_DefaultRepository.findAllByArticulo(id_empresa_sucursal, id_articulo, t);
            const yaEstaEnDestino = propiasDelArticulo.find(p => p.id_ubicacion_default === id_ubicacion_sucursal);
            if (yaEstaEnDestino) {
                for (const extra of propiasDelArticulo) {
                    if (extra.id_articulo_ubicacion_default !== yaEstaEnDestino.id_articulo_ubicacion_default) {
                        await Articulo_Ubicacion_DefaultRepository.eliminar(extra.id_articulo_ubicacion_default, t);
                    }
                }
                return yaEstaEnDestino;
            }

            if (propiasDelArticulo.length > 0) {
                const [primera, ...resto] = propiasDelArticulo;
                for (const extra of resto) {
                    await Articulo_Ubicacion_DefaultRepository.eliminar(extra.id_articulo_ubicacion_default, t);
                }
                return await Articulo_Ubicacion_DefaultRepository.moverAUbicacion(primera.id_articulo_ubicacion_default, id_ubicacion_sucursal, t);
            }

            return await Articulo_Ubicacion_DefaultRepository.create({
                id_empresa_sucursal,
                id_articulo,
                id_ubicacion_default: id_ubicacion_sucursal,
            }, t);
        });
    },
    getByIDArticuloConExistencia: async (id_empresa_sucursal: string, id_articulo: string) => {
        const rows = await Articulo_Ubicacion_DefaultRepository.getByIDArticulo(id_empresa_sucursal, id_articulo);

        const defaults = Array.isArray(rows)
            ? rows.map(r => (r.get ? r.get({ plain: true }) : r))
            : [];

        const idsUbic = defaults
            .map(x => x?.ubicacion_sucursal?.id_ubicacion_sucursal)
            .filter(Boolean);

        const existenciasRaw = await Stock_Ubicacion_LoteRepository.getExistenciasPorUbicacion(id_empresa_sucursal, id_articulo, idsUbic);
        //console.log(existenciasRaw)
        // diccionario: ubicacion -> existencia
        const mapExistencia = new Map<string, number>();
        for (const e of existenciasRaw as any[]) {
            mapExistencia.set(e.id_ubicacion_sucursal, Number(e.existencia) || 0);
        }

        // DTO final
        return defaults.map(x => ({
            id_articulo_ubicacion_default: x.id_articulo_ubicacion_default,
            id_articulo: x.id_articulo,
            id_empresa_sucursal: x.id_empresa_sucursal,
            ubicacion_sucursal: x.ubicacion_sucursal
                ? {
                    id_ubicacion_sucursal: x.ubicacion_sucursal.id_ubicacion_sucursal,
                    tipo_ubicacion: x.ubicacion_sucursal.tipo_ubicacion,
                    tarima_ub: x.ubicacion_sucursal.tarima_ub ?? null,
                    pasillo_ub: x.ubicacion_sucursal.pasillo_ub ?? null,
                    anaquel_ub: x.ubicacion_sucursal.anaquel_ub ?? null,
                    nivel_ub: x.ubicacion_sucursal.nivel_ub ?? null,
                    posicion_ub: x.ubicacion_sucursal.posicion_ub ?? null,
                }
                : null,
            existencia_en_esa_ubicacion: x.ubicacion_sucursal
                ? (mapExistencia.get(x.ubicacion_sucursal.id_ubicacion_sucursal) ?? 0)
                : 0,
        }));
    },

    getConflictos: async (id_empresa_sucursal: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getConflictos(id_empresa_sucursal);

        const etiquetaUbicacion = (u: typeof filas[number]) =>
            u.tipo_ubicacion === 'TARIMA'
                ? `Tarima ${u.tarima_ub}`
                : `${u.pasillo_ub || '—'}-${u.anaquel_ub}-${u.nivel_ub}-${u.posicion_ub}`;

        const porUbicacion = new Map<string, {
            id_ubicacion_default: string;
            etiqueta: string;
            tipo_ubicacion: string;
            articulos: { id_articulo: string; id_articulo_ubicacion_default: string; cod_int_artic: number; des_artic: string }[];
        }>();

        for (const f of filas) {
            if (!porUbicacion.has(f.id_ubicacion_default)) {
                porUbicacion.set(f.id_ubicacion_default, {
                    id_ubicacion_default: f.id_ubicacion_default,
                    etiqueta: etiquetaUbicacion(f),
                    tipo_ubicacion: f.tipo_ubicacion,
                    articulos: [],
                });
            }
            porUbicacion.get(f.id_ubicacion_default)!.articulos.push({
                id_articulo: f.id_articulo,
                id_articulo_ubicacion_default: f.id_articulo_ubicacion_default,
                cod_int_artic: f.cod_int_artic,
                des_artic: f.des_artic.trim(),
            });
        }

        return Array.from(porUbicacion.values());
    },

    getUbicacionesLibres: async (id_empresa_sucursal: string, id_articulo_excluir?: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getUbicacionesLibres(id_empresa_sucursal, id_articulo_excluir);
        return filas.map(u => ({
            id_ubicacion_sucursal: u.id_ubicacion_sucursal,
            etiqueta: `${u.pasillo_ub || '—'}-${u.anaquel_ub}-${u.nivel_ub}-${u.posicion_ub}`,
        }));
    },

    getSinUbicacionDefault: async (id_empresa_sucursal: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getSinUbicacionDefault(id_empresa_sucursal);
        return filas.map(f => ({
            id_articulo: f.id_articulo,
            cod_int_artic: f.cod_int_artic,
            des_artic: f.des_artic.trim(),
            existencia_total: Number(f.existencia_total),
        }));
    },

    eliminarDefault: async (id_articulo_ubicacion_default: string) => {
        const borrados = await Articulo_Ubicacion_DefaultRepository.eliminar(id_articulo_ubicacion_default);
        if (!borrados) throw new Error("No se encontró esa asignación de ubicación default.");
        return { ok: true };
    },
};