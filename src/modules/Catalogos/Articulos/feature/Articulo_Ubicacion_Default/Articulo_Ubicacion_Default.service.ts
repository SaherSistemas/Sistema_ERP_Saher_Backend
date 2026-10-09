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
            const tipoDestino = await Articulo_Ubicacion_DefaultRepository.getTipoUbicacion(id_ubicacion_sucursal, t);
            const destinoEsTarima = tipoDestino === 'TARIMA';

            // Una ubicación de anaquel/estantería solo puede ser default de UN artículo a la vez.
            // Una TARIMA sí puede tener varios artículos encima físicamente, así que ahí no se bloquea.
            const existenteEnDestino = await Articulo_Ubicacion_DefaultRepository.findByUbicacion(id_empresa_sucursal, id_ubicacion_sucursal, t);
            if (existenteEnDestino && existenteEnDestino.id_articulo !== id_articulo && !destinoEsTarima) {
                const existenciaDestino = await Stock_Ubicacion_LoteRepository.getExistenciaTotalEnUbicacion(id_ubicacion_sucursal, t);
                if (existenciaDestino > 0) {
                    const otroArticulo = (existenteEnDestino as any).articulo;
                    const nombre = otroArticulo ? `${otroArticulo.cod_int_artic} - ${otroArticulo.des_artic}` : 'otro artículo';
                    throw new Error(`Esta ubicación ya es default de ${nombre} y todavía tiene existencia ahí. Quítasela primero antes de asignarla aquí.`);
                }
                // Sin existencia física ahí: se reasigna de una vez — al artículo anterior se le
                // quita el default (queda sin ubicación) y se le asigna a este.
                await Articulo_Ubicacion_DefaultRepository.eliminar(existenteEnDestino.id_articulo_ubicacion_default, t);
            }

            // Un artículo puede tener HASTA 2 ubicaciones default a la vez: una de anaquel/estantería
            // y una de tarima (son cosas distintas: el anaquel es su lugar fijo de picking, la tarima
            // es donde tiene el bulto/reserva). Por eso el "mover" solo reemplaza la ubicación del
            // MISMO tipo que el destino; la del otro tipo, si existe, se deja intacta.
            const propiasDelArticulo = await Articulo_Ubicacion_DefaultRepository.findAllByArticulo(id_empresa_sucursal, id_articulo, t);
            const propiasConTipo = await Promise.all(propiasDelArticulo.map(async (p) => ({
                fila: p,
                esTarima: (await Articulo_Ubicacion_DefaultRepository.getTipoUbicacion(p.id_ubicacion_default, t)) === 'TARIMA',
            })));
            const mismoGrupo = propiasConTipo.filter(p => p.esTarima === destinoEsTarima).map(p => p.fila);

            const yaEstaEnDestino = mismoGrupo.find(p => p.id_ubicacion_default === id_ubicacion_sucursal);
            if (yaEstaEnDestino) {
                for (const extra of mismoGrupo) {
                    if (extra.id_articulo_ubicacion_default !== yaEstaEnDestino.id_articulo_ubicacion_default) {
                        await Articulo_Ubicacion_DefaultRepository.eliminar(extra.id_articulo_ubicacion_default, t);
                    }
                }
                return yaEstaEnDestino;
            }

            if (mismoGrupo.length > 0) {
                const [primera, ...resto] = mismoGrupo;
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

    // Artículos con más de 1 ubicación de anaquel/estantería como default — el máximo permitido
    // es 1 anaquel + 1 tarima, así que esto siempre es una anomalía a corregir.
    getArticulosConExcesoUbicaciones: async (id_empresa_sucursal: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getArticulosConExcesoUbicaciones(id_empresa_sucursal);

        const etiquetaUbicacion = (u: typeof filas[number]) =>
            u.tipo_ubicacion === 'TARIMA'
                ? `Tarima ${u.tarima_ub}`
                : `${u.pasillo_ub || '—'}-${u.anaquel_ub}-${u.nivel_ub}-${u.posicion_ub}`;

        const porArticulo = new Map<string, {
            id_articulo: string;
            cod_int_artic: number;
            des_artic: string;
            ubicaciones: { id_articulo_ubicacion_default: string; id_ubicacion_sucursal: string; tipo_ubicacion: string; etiqueta: string }[];
        }>();

        for (const f of filas) {
            if (!porArticulo.has(f.id_articulo)) {
                porArticulo.set(f.id_articulo, {
                    id_articulo: f.id_articulo,
                    cod_int_artic: f.cod_int_artic,
                    des_artic: f.des_artic.trim(),
                    ubicaciones: [],
                });
            }
            porArticulo.get(f.id_articulo)!.ubicaciones.push({
                id_articulo_ubicacion_default: f.id_articulo_ubicacion_default,
                id_ubicacion_sucursal: f.id_ubicacion_sucursal,
                tipo_ubicacion: f.tipo_ubicacion,
                etiqueta: etiquetaUbicacion(f),
            });
        }

        return Array.from(porArticulo.values());
    },

    getUbicacionesLibres: async (id_empresa_sucursal: string, id_articulo_excluir?: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getUbicacionesLibres(id_empresa_sucursal, id_articulo_excluir);
        return filas.map(u => ({
            id_ubicacion_sucursal: u.id_ubicacion_sucursal,
            etiqueta: u.tipo_ubicacion === 'TARIMA'
                ? `Tarima ${u.tarima_ub}`
                : `${u.pasillo_ub || '—'}-${u.anaquel_ub}-${u.nivel_ub}-${u.posicion_ub}`,
        }));
    },

    getSinUbicacionDefault: async (id_empresa_sucursal: string) => {
        const filas = await Articulo_Ubicacion_DefaultRepository.getSinUbicacionDefault(id_empresa_sucursal);
        return filas.map(f => ({
            id_articulo: f.id_articulo,
            cod_int_artic: f.cod_int_artic,
            des_artic: f.des_artic.trim(),
            cod_barr_artic: String(f.cod_barr_artic ?? '').trim(),
            existencia_total: Number(f.existencia_total),
        }));
    },

    eliminarDefault: async (id_articulo_ubicacion_default: string) => {
        const borrados = await Articulo_Ubicacion_DefaultRepository.eliminar(id_articulo_ubicacion_default);
        if (!borrados) throw new Error("No se encontró esa asignación de ubicación default.");
        return { ok: true };
    },
};