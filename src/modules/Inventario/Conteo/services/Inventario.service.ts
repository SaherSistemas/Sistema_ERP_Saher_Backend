import { Op, QueryTypes } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { InventarioRepository } from '../repositories/Inventario.repository';
import { TipoInventario, StatusInventario } from '../model/Inventario';
import Stock_Ubicacion_Lote from '../../Stock/model/Stock_Ubicacion_Lote';
import Detalle_Inventario from '../model/Detalle_Inventario';
import Inventario from '../model/Inventario';
import Lote_Articulo_Sucursal from '../../Lotes/model/Lote_Articulo_Sucursal';
import { LotesArticuloSucursalRepository } from '../../Lotes/repository/Lote_ArticuloSucursal.repository';
import { Articulo_Ubicacion_DefaultRepository } from '../../../Catalogos/Articulos/feature/Articulo_Ubicacion_Default/Articulo_Ubicacion_Default.repository';

// Piezas apartadas (ya surtidas para un pedido y fuera del anaquel) de la existencia que corresponde a cada renglón del conteo
async function apartadasPorDetalle(id_empresa_sucursal: string, detalles: any[]): Promise<Map<string, number>> {
    const mapa = new Map<string, number>();
    const ids = Array.from(new Set(detalles.map(d => d.id_articulo)));
    if (!ids.length) return mapa;
    const stocks = await Stock_Ubicacion_Lote.findAll({
        where: { id_empresa_sucursal, id_articulo: { [Op.in]: ids } },
        attributes: ['id_articulo', 'id_ubicacion_sucursal', 'id_lote', 'cantidad_apartada'],
        raw: true,
    }) as any[];
    for (const d of detalles) {
        const ap = stocks
            .filter(s => s.id_articulo === d.id_articulo
                && (!d.id_ubicacion_sucursal || s.id_ubicacion_sucursal === d.id_ubicacion_sucursal)
                && (!d.id_lote || s.id_lote === d.id_lote))
            .reduce((a, s) => a + (Number(s.cantidad_apartada) || 0), 0);
        mapa.set(d.id_detalle_inventario, ap);
    }
    return mapa;
}

// Un faltante contado se explica por lo apartado cuando las piezas que "faltan" son justo piezas ya surtidas para pedidos
const explicadoPorApartado = (d: any, apartada: number): boolean => {
    if (!d.contado || !d.ajustar || d.ajustado || d.cant_contada === null || d.cant_contada === undefined) return false;
    const dif = Number(d.cant_contada) - Number(d.cant_sistema);
    return dif < 0 && apartada >= -dif;
};

export const InventarioService = {

    getLista: (id_empresa_sucursal: string, params: {
        status?: StatusInventario;
        tipo?: TipoInventario;
        fecha_inicio?: string;
        fecha_fin?: string;
    }) => InventarioRepository.getLista(id_empresa_sucursal, params),

    getById: (id_inventario: string) => InventarioRepository.getById(id_inventario),

    // El inventario con, por renglón, cuántas piezas hay apartadas ahora (para detectar faltantes que en realidad están surtidos)
    getByIdConApartadas: async (id_inventario: string) => {
        // Si mientras se contaba se asignó mercancía a esas ubicaciones, se agrega como renglones nuevos por contar
        try { await InventarioRepository.sincronizarNuevos(id_inventario); }
        catch (e: any) { console.error('[Inventario] No se pudieron sincronizar renglones nuevos:', e?.message ?? e); }
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) return null;
        const plano: any = inv.toJSON();
        const detalles: any[] = plano.detalles ?? [];
        const mapa = await apartadasPorDetalle(inv.id_empresa_sucursal, detalles);
        // "Sistema" en vivo: lo que hay AHORA en esa ubicación, no la foto de cuando se contó (los renglones ya ajustados no cambian)
        const vivo = await InventarioRepository.sistemaActual(inv.id_empresa_sucursal, detalles.filter(d => !d.ajustado));
        plano.detalles = detalles.map(d => {
            const actual = vivo.get(d.id_detalle_inventario);
            return {
                ...d,
                cant_sistema_original: d.cant_sistema,
                ...(actual !== undefined ? { cant_sistema: actual } : {}),
                apartada_actual: mapa.get(d.id_detalle_inventario) ?? 0,
            };
        });
        return plano;
    },

    // Cuenta por artículo de lo que se ha inventariado: junta lo contado en este inventario con lo que el sistema
    // tiene del mismo artículo FUERA de él (tarima y otras ubicaciones), para sacar la diferencia real.
    //  · sistema_total   = lo que debería haber en todo el almacén (existencia menos lo apartado/surtido).
    //  · contado         = lo contado en este inventario; por_contar = lo que aún falta de contar (en sistema).
    //  · en_tarima/otras = lo que el sistema tiene en ubicaciones que NO están en este inventario.
    //  · diferencia_real = contado menos lo que el sistema tenía de eso mismo (lo no contado y lo de fuera no se toca).
    cuentaPorArticulo: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) return null;
        const detalles: any[] = (inv.detalles ?? []).map((d: any) => (d.toJSON ? d.toJSON() : d));
        const vivo = await InventarioRepository.sistemaActual(inv.id_empresa_sucursal, detalles.filter(d => !d.ajustado));
        for (const d of detalles) {
            const actual = vivo.get(d.id_detalle_inventario);
            if (actual !== undefined) d.cant_sistema = actual;
        }

        // Ubicaciones que forman parte de este inventario
        const f: any = inv.filtro ?? {};
        const idsAlcance = new Set<string>();
        (Array.isArray(f.ids_ubicaciones) ? f.ids_ubicaciones : []).forEach((i: string) => idsAlcance.add(String(i)));
        if (f.id_ubicacion_sucursal) idsAlcance.add(String(f.id_ubicacion_sucursal));
        detalles.forEach(d => { if (d.id_ubicacion_sucursal) idsAlcance.add(String(d.id_ubicacion_sucursal)); });
        const norm = (v: unknown) => String(v ?? '').trim().toUpperCase();

        const idsArticulos = Array.from(new Set(detalles.map(d => String(d.id_articulo))));
        const stock = idsArticulos.length
            ? await dbLocal.query<any>(`
                SELECT s.id_articulo, s.id_ubicacion_sucursal, s.cantidad, COALESCE(s.cantidad_apartada, 0) AS apartada,
                       u.tipo_ubicacion, u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub, u.tarima_ub
                FROM stock_ubicacion_lote s
                LEFT JOIN ubicacion_sucursal u ON u.id_ubicacion_sucursal = s.id_ubicacion_sucursal
                WHERE s.id_empresa_sucursal = :emp AND s.id_articulo IN (:ids) AND s.cantidad > 0
            `, { replacements: { emp: inv.id_empresa_sucursal, ids: idsArticulos }, type: QueryTypes.SELECT }) as any[]
            : [];

        const dentro = (r: any): boolean => {
            if (idsAlcance.has(String(r.id_ubicacion_sucursal))) return true;
            if (inv.tipo_inventario === 'GENERAL' || inv.tipo_inventario === 'ARTICULO') return true;
            if (inv.tipo_inventario === 'PASILLO' && f.pasillo) return r.tipo_ubicacion !== 'TARIMA' && norm(r.pasillo_ub) === norm(f.pasillo);
            if (inv.tipo_inventario === 'TARIMA' && f.tarima) return r.tipo_ubicacion === 'TARIMA' && norm(r.tarima_ub) === norm(f.tarima);
            return false;
        };
        const etiqueta = (r: any) => r.tipo_ubicacion === 'TARIMA'
            ? `Tarima ${String(r.tarima_ub ?? '').trim()}`
            : r.id_ubicacion_sucursal
                ? [r.pasillo_ub, r.anaquel_ub, r.nivel_ub, r.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-')
                : 'Sin ubicación';
        const esperado = (r: any) => Math.max(0, (Number(r.cantidad) || 0) - (Number(r.apartada) || 0));

        const articulos = idsArticulos.map(id => {
            const ren = detalles.filter(d => String(d.id_articulo) === id);
            const contados = ren.filter(d => d.contado && d.cant_contada !== null && d.cant_contada !== undefined);
            const sinContar = ren.filter(d => !contados.includes(d));
            const sum = (l: any[], campo: string) => l.reduce((a, d) => a + (Number(d[campo]) || 0), 0);

            const sistemaContados = sum(contados, 'cant_sistema');
            const contado = sum(contados, 'cant_contada');
            const porContar = sum(sinContar, 'cant_sistema');

            const fuera = stock.filter(r => String(r.id_articulo) === id && !dentro(r));
            const agrupar = (lista: any[]) => {
                const m = new Map<string, number>();
                lista.forEach(r => m.set(etiqueta(r), (m.get(etiqueta(r)) ?? 0) + esperado(r)));
                return Array.from(m.entries()).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
            };
            const tarimas = agrupar(fuera.filter(r => r.tipo_ubicacion === 'TARIMA'));
            const otras = agrupar(fuera.filter(r => r.tipo_ubicacion !== 'TARIMA'));
            const enTarima = tarimas.reduce((a, [, c]) => a + c, 0);
            const enOtras = otras.reduce((a, [, c]) => a + c, 0);
            const art = ren[0]?.articulo ?? {};

            return {
                id_articulo: id,
                cod_int_artic: art.cod_int_artic ?? null,
                des_artic: String(art.des_artic ?? '').trim(),
                cod_barr_artic: String(art.cod_barr_artic ?? '').trim(),
                // Ubicaciones de los renglones de este inventario (donde se contó / se espera)
                ubicaciones: (() => {
                    const labels = Array.from(new Set(ren.map(d => d.ubicacion
                        ? etiqueta({ ...d.ubicacion, id_ubicacion_sucursal: d.id_ubicacion_sucursal, tipo_ubicacion: d.ubicacion.tarima_ub ? 'TARIMA' : 'ESTANTERIA' })
                        : 'Sin ubicación')));
                    return labels.slice(0, 6).join(', ') + (labels.length > 6 ? '…' : '');
                })(),
                renglones: ren.length,
                renglones_sin_contar: sinContar.length,
                sistema_contados: sistemaContados,
                contado,
                por_contar: porContar,
                en_tarima: enTarima,
                tarimas: tarimas.map(([e, c]) => `${e} (${c})`).join(', '),
                en_otras: enOtras,
                otras: otras.slice(0, 4).map(([e, c]) => `${e} (${c})`).join(', ') + (otras.length > 4 ? '…' : ''),
                sistema_total: sistemaContados + porContar + enTarima + enOtras,
                renglones_contados: contados.length,
                // Contra TODOS los renglones del artículo en este inventario (contados y por contar): lo que el sistema
                // esperaba en otro lote/ubicación sin contar y apareció contado en otro renglón cuenta como cuadrado.
                // Un artículo sin ningún renglón contado todavía no tiene diferencia.
                diferencia_real: contados.length ? contado - sistemaContados - porContar : 0,
                // Solo lo contado contra lo que el sistema tenía en esos mismos renglones
                diferencia_contados: contado - sistemaContados,
            };
        });

        const suma = (campo: 'sistema_total' | 'contado' | 'sistema_contados' | 'por_contar' | 'en_tarima' | 'en_otras') =>
            articulos.reduce((a, x) => a + x[campo], 0);
        return {
            id_inventario,
            tipo_inventario: inv.tipo_inventario,
            status: inv.status,
            notas: inv.notas ?? null,
            articulos,
            totales: {
                sistema_total: suma('sistema_total'),
                sistema_contados: suma('sistema_contados'),
                contado: suma('contado'),
                por_contar: suma('por_contar'),
                en_tarima: suma('en_tarima'),
                en_otras: suma('en_otras'),
                faltante_real: articulos.filter(a => a.diferencia_real < 0).reduce((s, a) => s - a.diferencia_real, 0),
                sobrante_real: articulos.filter(a => a.diferencia_real > 0).reduce((s, a) => s + a.diferencia_real, 0),
            },
            generado: new Date().toISOString(),
        };
    },

    // Resumen consolidado de varios inventarios (los seleccionados en la lista): qué faltó, qué sobró y cuánto
    // vale en costo. El costo sale del lote de cada renglón; si el lote no tiene costo se usa el último costo
    // conocido del artículo y, si tampoco hay, se marca "sin costo".
    resumenSeleccion: async (ids: string[], id_empresa: string) => {
        const unicos = Array.from(new Set(ids.map(String))).slice(0, 80);
        const invs: any[] = [];
        for (const id of unicos) {
            const inv = await InventarioRepository.getById(id);
            if (inv && String(inv.id_empresa_sucursal) === String(id_empresa)) invs.push(inv);
        }

        // Renglones de todos los inventarios, con el sistema en vivo de los que aún no se ajustan
        const renglones: { id_inventario: string; d: any }[] = [];
        for (const inv of invs) {
            const detalles: any[] = (inv.detalles ?? []).map((d: any) => (d.toJSON ? d.toJSON() : d));
            const vivo = await InventarioRepository.sistemaActual(inv.id_empresa_sucursal, detalles.filter(d => !d.ajustado));
            for (const d of detalles) {
                const actual = vivo.get(d.id_detalle_inventario);
                if (actual !== undefined) d.cant_sistema = actual;
                renglones.push({ id_inventario: inv.id_inventario, d });
            }
        }

        // Costos: del lote del renglón y, si no tiene, el último costo > 0 del artículo en la empresa
        const loteIds = Array.from(new Set(renglones.map(r => r.d.id_lote).filter(Boolean).map(String)));
        const lotes = loteIds.length
            ? await Lote_Articulo_Sucursal.findAll({
                where: { id_lote_sucursal: { [Op.in]: loteIds } },
                attributes: ['id_lote_sucursal', 'precio_costo_lote_sucursal'],
                raw: true,
            }) as any[]
            : [];
        const costoLote = new Map<string, number>(lotes.map(l => [String(l.id_lote_sucursal), Number(l.precio_costo_lote_sucursal) || 0]));

        const idsArt = Array.from(new Set(renglones.map(r => String(r.d.id_articulo))));
        const ultimos = idsArt.length
            ? await dbLocal.query<any>(`
                SELECT DISTINCT ON (id_artic) id_artic, precio_costo_lote_sucursal AS costo
                FROM lote_articulo_sucursal
                WHERE id_empre = :emp AND id_artic IN (:ids) AND precio_costo_lote_sucursal > 0
                ORDER BY id_artic, "createdAt" DESC
            `, { replacements: { emp: id_empresa, ids: idsArt }, type: QueryTypes.SELECT }) as any[]
            : [];
        const ultimoCosto = new Map<string, number>(ultimos.map(u => [String(u.id_artic), Number(u.costo) || 0]));

        type Acum = {
            id_articulo: string; cod_int_artic: number | null; des_artic: string; cod_barr_artic: string;
            inventarios: Set<string>; pos: number; neg: number; valor_pos: number; valor_neg: number; sin_costo: boolean;
            ubicaciones: Set<string>;
        };
        const arts = new Map<string, Acum>();
        const porInv = new Map<string, {
            renglones: number; contados: number; sin_contar: number; pz_sin_contar: number;
            faltante_pz: number; sobrante_pz: number; faltante_valor: number; sobrante_valor: number;
        }>();
        invs.forEach(i => porInv.set(String(i.id_inventario), {
            renglones: 0, contados: 0, sin_contar: 0, pz_sin_contar: 0, faltante_pz: 0, sobrante_pz: 0, faltante_valor: 0, sobrante_valor: 0,
        }));

        const etiquetaUb = (u: any) => !u ? '' : (u.tarima_ub ? `Tarima ${String(u.tarima_ub).trim()}`
            : [u.pasillo_ub, u.anaquel_ub, u.nivel_ub, u.posicion_ub].map((p: any) => String(p ?? '').trim()).filter(Boolean).join('-'));

        for (const { id_inventario, d } of renglones) {
            const resInv = porInv.get(String(id_inventario))!;
            resInv.renglones += 1;
            const contado = d.contado && d.cant_contada !== null && d.cant_contada !== undefined;
            if (!contado) {
                resInv.sin_contar += 1;
                resInv.pz_sin_contar += Number(d.cant_sistema) || 0;
                continue;
            }
            resInv.contados += 1;

            const dif = Number(d.cant_contada) - Number(d.cant_sistema);
            if (dif === 0) continue;

            const idArt = String(d.id_articulo);
            const costoDelLote = d.id_lote ? (costoLote.get(String(d.id_lote)) ?? 0) : 0;
            const costo = costoDelLote > 0 ? costoDelLote : (ultimoCosto.get(idArt) ?? 0);

            if (!arts.has(idArt)) {
                arts.set(idArt, {
                    id_articulo: idArt,
                    cod_int_artic: d.articulo?.cod_int_artic ?? null,
                    des_artic: String(d.articulo?.des_artic ?? '').trim(),
                    cod_barr_artic: String(d.articulo?.cod_barr_artic ?? '').trim(),
                    inventarios: new Set(), pos: 0, neg: 0, valor_pos: 0, valor_neg: 0, sin_costo: false, ubicaciones: new Set(),
                });
            }
            const a = arts.get(idArt)!;
            a.inventarios.add(String(id_inventario));
            const ub = etiquetaUb(d.ubicacion);
            if (ub) a.ubicaciones.add(ub);
            if (costo <= 0) a.sin_costo = true;

            if (dif > 0) { a.pos += dif; a.valor_pos += dif * costo; resInv.sobrante_pz += dif; resInv.sobrante_valor += dif * costo; }
            else { a.neg += -dif; a.valor_neg += -dif * costo; resInv.faltante_pz += -dif; resInv.faltante_valor += -dif * costo; }
        }

        const r2 = (v: number) => Math.round(v * 100) / 100;
        const articulos = Array.from(arts.values()).map(a => {
            const bruto = a.pos + a.neg;
            const costoProm = bruto > 0 ? (a.valor_pos + a.valor_neg) / bruto : 0;
            const neto = a.pos - a.neg;
            return {
                id_articulo: a.id_articulo,
                cod_int_artic: a.cod_int_artic,
                des_artic: a.des_artic,
                cod_barr_artic: a.cod_barr_artic,
                ubicaciones: Array.from(a.ubicaciones).slice(0, 6).join(', ') + (a.ubicaciones.size > 6 ? '…' : ''),
                inventarios: a.inventarios.size,
                sobrante_pz: a.pos,                         // lo que apareció de más (por renglón)
                faltante_pz: a.neg,                         // lo que faltó (por renglón)
                neto_pz: neto,                              // positivo = sobrante real, negativo = faltante real
                entre_lotes_pz: Math.min(a.pos, a.neg),     // salió de un lote y entró a otro: no es faltante ni sobrante
                costo_promedio: r2(costoProm),
                valor_sobrante: r2(a.valor_pos),
                valor_faltante: r2(a.valor_neg),
                valor_neto: r2(neto * costoProm),           // diferencia real a costo
                sin_costo: a.sin_costo,
            };
        });

        const sum = (l: any[], campo: string) => l.reduce((s, x) => s + (Number(x[campo]) || 0), 0);
        const faltantes = articulos.filter(a => a.neto_pz < 0);
        const sobrantes = articulos.filter(a => a.neto_pz > 0);
        const inventarios = invs.map(inv => {
            const r = porInv.get(String(inv.id_inventario))!;
            return {
                id_inventario: inv.id_inventario,
                tipo_inventario: inv.tipo_inventario,
                status: inv.status,
                notas: inv.notas ?? null,
                createdAt: inv.createdAt,
                fecha_aplicacion: inv.fecha_aplicacion ?? null,
                renglones: r.renglones,
                contados: r.contados,
                sin_contar: r.sin_contar,
                pz_sin_contar: r.pz_sin_contar,
                faltante_pz: r.faltante_pz,
                sobrante_pz: r.sobrante_pz,
                faltante_valor: r2(r.faltante_valor),
                sobrante_valor: r2(r.sobrante_valor),
            };
        });

        return {
            inventarios,
            articulos,
            totales: {
                inventarios: inventarios.length,
                renglones: sum(inventarios, 'renglones'),
                contados: sum(inventarios, 'contados'),
                sin_contar: sum(inventarios, 'sin_contar'),
                pz_sin_contar: sum(inventarios, 'pz_sin_contar'),
                // Bruto: lo que se movió renglón por renglón (lo que queda en el Kardex como entrada/merma por ajuste)
                faltante_bruto_pz: sum(articulos, 'faltante_pz'),
                sobrante_bruto_pz: sum(articulos, 'sobrante_pz'),
                faltante_bruto_valor: r2(sum(articulos, 'valor_faltante')),
                sobrante_bruto_valor: r2(sum(articulos, 'valor_sobrante')),
                // Real: por artículo, después de compensar lo que solo cambió de lote o ubicación
                articulos_con_diferencia: articulos.length,
                faltante_real_pz: faltantes.reduce((s, a) => s - a.neto_pz, 0),
                sobrante_real_pz: sobrantes.reduce((s, a) => s + a.neto_pz, 0),
                faltante_real_valor: r2(faltantes.reduce((s, a) => s - a.valor_neto, 0)),
                sobrante_real_valor: r2(sobrantes.reduce((s, a) => s + a.valor_neto, 0)),
                entre_lotes_pz: sum(articulos, 'entre_lotes_pz'),
                articulos_sin_costo: articulos.filter(a => a.sin_costo).length,
            },
            generado: new Date().toISOString(),
        };
    },

    // Da de baja los renglones sin contar que siguen vivos en el sistema (ver el repositorio)
    darDeBajaSinContar: (id_inventario: string, aplicado_por: string, ids?: string[]) =>
        InventarioRepository.darDeBajaSinContar(id_inventario, aplicado_por, ids),

    // Marca si un renglón se va a ajustar o no al aplicar el conteo (mientras se cuenta o ya terminado)
    ajustarRenglon: async (id_detalle_inventario: string, ajustar: boolean) => {
        const det = await Detalle_Inventario.findByPk(id_detalle_inventario);
        if (!det) throw new Error('Renglón no encontrado');
        const inv = await Inventario.findByPk(det.id_inventario);
        if (!inv || !['EN_CONTEO', 'TERMINADO'].includes(inv.status)) {
            throw new Error('Solo se puede cambiar mientras el inventario está en conteo o terminado');
        }
        if (det.ajustado) throw new Error('Este renglón ya fue ajustado');
        await det.update({ ajustar });
        return det;
    },

    // Deja sin ajustar los faltantes que coinciden con piezas apartadas (ya surtidas): si se aplicaran,
    // se descontarían dos veces (al aplicar el conteo y otra al facturar el pedido).
    ignorarFaltantesApartados: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status !== 'TERMINADO') throw new Error('El inventario debe estar TERMINADO');
        const detalles: any[] = (inv.detalles ?? []).map((d: any) => d.toJSON());
        const vivo = await InventarioRepository.sistemaActual(inv.id_empresa_sucursal, detalles.filter(d => !d.ajustado));
        for (const d of detalles) {
            const actual = vivo.get(d.id_detalle_inventario);
            if (actual !== undefined) d.cant_sistema = actual;
        }
        const mapa = await apartadasPorDetalle(inv.id_empresa_sucursal, detalles);
        const ids = detalles.filter(d => explicadoPorApartado(d, mapa.get(d.id_detalle_inventario) ?? 0)).map(d => d.id_detalle_inventario);
        if (ids.length) {
            await Detalle_Inventario.update({ ajustar: false }, { where: { id_detalle_inventario: { [Op.in]: ids } } });
        }
        return { ok: true, renglones: ids.length };
    },

    // Crea encabezado + genera renglones en una sola transacción
    crear: async (data: {
        id_empresa_sucursal: string;
        tipo_inventario: TipoInventario;
        filtro?: { pasillo?: string; id_ubicacion_sucursal?: string; ids_ubicaciones?: string[]; etiqueta?: string; id_articulo?: string; id_articulos?: string[] };
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
            const numeroLote = dto.numero_lote_nuevo.trim();
            const loteExistente = await Lote_Articulo_Sucursal.findOne({
                where: { id_artic: dto.id_articulo, id_empre: inv.id_empresa_sucursal, numero_lote_sucursal: numeroLote },
            });

            if (loteExistente) {
                // Ese lote ya existe: se usa tal cual. Antes se "actualizaba" con costo 0 y le borraba el costo
                // al lote (el valor del inventario salía en $0). Solo se corrige la caducidad si cambió.
                id_lote = loteExistente.id_lote_sucursal;
                const nueva = new Date(dto.fecha_vencimiento_nueva);
                const actual = loteExistente.fecha_venci_lote_sucursal ? new Date(loteExistente.fecha_venci_lote_sucursal as any) : null;
                const mismoDia = actual && !isNaN(actual.getTime()) && !isNaN(nueva.getTime())
                    && actual.toISOString().slice(0, 10) === nueva.toISOString().slice(0, 10);
                if (!mismoDia) await loteExistente.update({ fecha_venci_lote_sucursal: nueva as any });
            } else {
                // Lote nuevo: hereda el último costo conocido del artículo (su lote más reciente con costo), no 0
                const ultimoConCosto = await Lote_Articulo_Sucursal.findOne({
                    where: {
                        id_artic: dto.id_articulo,
                        id_empre: inv.id_empresa_sucursal,
                        precio_costo_lote_sucursal: { [Op.gt]: 0 },
                    },
                    order: [['createdAt', 'DESC']],
                    attributes: ['precio_costo_lote_sucursal'],
                });
                const lote = await LotesArticuloSucursalRepository.updateOrCreateLoteSucursal({
                    id_artic: dto.id_articulo,
                    id_empre: inv.id_empresa_sucursal,
                    numero_lote_sucursal: numeroLote,
                    fecha_venci_lote_sucursal: new Date(dto.fecha_vencimiento_nueva) as any,
                    cantidad_entrada_lote: 0,
                    precio_costo_lote_sucursal: Number(ultimoConCosto?.precio_costo_lote_sucursal) || 0,
                    estado_lote_sucursal: 'A',
                } as any);
                id_lote = lote.id_lote_sucursal;
            }
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

    aplicar: async (id_inventario: string, aplicado_por: string, marcarInicial: boolean = false, base?: 'AHORA' | 'CONTEO') => {
        // Renglones nuevos: artículo que se encontró físicamente en una ubicación donde el
        // sistema no tenía nada (cant_sistema = 0). Se capturan ANTES de aplicar porque
        // aplicar marca los renglones como ajustados.
        const inv = await InventarioRepository.getById(id_inventario);
        const nuevos = (inv?.detalles ?? []).filter(d =>
            d.contado && d.ajustar && !d.ajustado
            && Number(d.cant_sistema) === 0 && Number(d.cant_contada) > 0
            && !!d.id_ubicacion_sucursal
        );

        const resultado = await InventarioRepository.aplicar(id_inventario, aplicado_por, marcarInicial, base);

        // Ubicación default: solo si el artículo no tenía ya una del mismo tipo (anaquel/tarima)
        // y, en anaquel, la ubicación no es default de otro artículo. No se mueve ni se quita
        // ninguna default existente — eso se decide a mano.
        const defaults_asignados: string[] = [];
        const defaults_omitidos: { id_articulo: string; motivo: string }[] = [];
        const vistos = new Set<string>();
        for (const d of nuevos) {
            const id_articulo = d.id_articulo;
            const id_ubicacion = d.id_ubicacion_sucursal as string;
            const clave = `${id_articulo}|${id_ubicacion}`;
            if (vistos.has(clave)) continue;
            vistos.add(clave);
            try {
                const id_empresa = inv!.id_empresa_sucursal;
                const esTarima = (await Articulo_Ubicacion_DefaultRepository.getTipoUbicacion(id_ubicacion)) === 'TARIMA';
                const propias = await Articulo_Ubicacion_DefaultRepository.findAllByArticulo(id_empresa, id_articulo);
                let yaTieneDelMismoTipo = false;
                for (const p of propias) {
                    const pTarima = (await Articulo_Ubicacion_DefaultRepository.getTipoUbicacion(p.id_ubicacion_default)) === 'TARIMA';
                    if (pTarima === esTarima) { yaTieneDelMismoTipo = true; break; }
                }
                if (yaTieneDelMismoTipo) {
                    defaults_omitidos.push({ id_articulo, motivo: 'Ya tenía ubicación default de este tipo' });
                    continue;
                }
                if (!esTarima) {
                    const enDestino = await Articulo_Ubicacion_DefaultRepository.findByUbicacion(id_empresa, id_ubicacion);
                    if (enDestino && enDestino.id_articulo !== id_articulo) {
                        defaults_omitidos.push({ id_articulo, motivo: 'La ubicación ya es default de otro artículo' });
                        continue;
                    }
                }
                await Articulo_Ubicacion_DefaultRepository.create({ id_empresa_sucursal: id_empresa, id_articulo, id_ubicacion_default: id_ubicacion });
                defaults_asignados.push(id_articulo);
            } catch (e: any) {
                defaults_omitidos.push({ id_articulo, motivo: e?.message ?? 'Error al asignar default' });
            }
        }

        return { ...(resultado as any).toJSON(), defaults_asignados, defaults_omitidos };
    },

    cancelar: async (id_inventario: string) => {
        const inv = await InventarioRepository.getById(id_inventario);
        if (!inv) throw new Error('Inventario no encontrado');
        if (inv.status === 'APLICADO') throw new Error('No se puede cancelar un inventario ya aplicado');
        await InventarioRepository.cambiarStatus(id_inventario, 'CANCELADO');
        return { ok: true };
    },
};
