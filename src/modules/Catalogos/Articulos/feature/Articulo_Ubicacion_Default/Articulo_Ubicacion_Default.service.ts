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
        const data = {
            id_empresa_sucursal,
            id_articulo,
            id_ubicacion_default: id_ubicacion_sucursal
        }
        const ubicacionCreada = await Articulo_Ubicacion_DefaultRepository.create(data)
        //console.log(ubicacionCreada)
        return ubicacionCreada
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
};