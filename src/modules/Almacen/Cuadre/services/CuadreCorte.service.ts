import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import { dbLocal } from '../../../../config/db';
import Cuadre_Corte from '../model/Cuadre_Corte.model';
import Cuadre_Corte_Lote from '../model/Cuadre_Corte_Lote.model';

const num = (v: unknown) => Number(v ?? 0) || 0;

// CAMBIO_LOTE: la diferencia del lote se compensa con la de otro lote del MISMO artículo (suma 0). Es lo que deja
// Existencias → "Cambiar lote" (corrige un lote mal capturado): mueve piezas de un lote a otro y no genera kardex.
// No es fuga: el artículo tiene las piezas que debe, solo cambió de lote.
export type EstadoFuga = 'CUADRA' | 'FALTAN' | 'SOBRAN' | 'CAMBIO_LOTE';

export interface ILoteCorte {
    id_lote: string;
    cod_int_artic: number | string;
    articulo: string;
    numero_lote: string;
    en_corte: number;
    entradas: number;
    ventas: number;
    otras_salidas: number;
    /** Si alguien aplicó un inventario después del corte, se parte de ese conteo en vez del corte */
    recontado: boolean;
    esperada: number;
    sistema: number;
    /** sistema − esperada: negativo = faltan piezas (fuga); positivo = sobran */
    diferencia: number;
    estado: EstadoFuga;
    ultimo_movimiento: string | null;
}

const entra = (t: string) => t === 'AJUSTE_ENTRADA' || t === 'ENTRADA';

export const CuadreCorteService = {

    crear: async (id_empresa: string, id_empleado: string | null, nombre: string, notas: string | null) => {
        const nom = nombre.trim() || `Corte ${new Date().toLocaleDateString('es-MX')}`;
        return await dbLocal.transaction(async (t) => {
            const [{ ahora }] = await dbLocal.query<any>(`SELECT NOW() AS ahora`, { type: QueryTypes.SELECT, transaction: t });
            const corte = await Cuadre_Corte.create({
                id_empresa_sucursal: id_empresa, nombre: nom, notas: notas?.trim() || null, fecha_corte: ahora, creado_por: id_empleado,
            } as any, { transaction: t });

            const stock = await dbLocal.query<any>(`
                SELECT s.id_lote, l.id_artic, SUM(s.cantidad) AS cantidad, SUM(COALESCE(s.cantidad_apartada, 0)) AS apartada
                FROM stock_ubicacion_lote s JOIN lote_articulo_sucursal l ON l.id_lote_sucursal = s.id_lote
                WHERE s.id_empresa_sucursal = :emp
                GROUP BY s.id_lote, l.id_artic
                HAVING SUM(s.cantidad) <> 0 OR SUM(COALESCE(s.cantidad_apartada, 0)) <> 0`,
                { replacements: { emp: id_empresa }, type: QueryTypes.SELECT, transaction: t });

            const filas = stock.map((s: any) => ({
                id_cuadre_corte: corte.id_cuadre_corte, id_lote: s.id_lote, id_articulo: s.id_artic, cantidad: num(s.cantidad), apartada: num(s.apartada),
            }));
            for (let i = 0; i < filas.length; i += 1000) await Cuadre_Corte_Lote.bulkCreate(filas.slice(i, i + 1000) as any, { transaction: t });

            await corte.update({ total_lotes: filas.length, total_piezas: filas.reduce((s: number, f: any) => s + f.cantidad, 0) }, { transaction: t });
            return corte.get({ plain: true });
        });
    },

    listar: async (id_empresa: string) => {
        const rows = await dbLocal.query<any>(`
            SELECT id_cuadre_corte, nombre, notas, fecha_corte, total_lotes, total_piezas
            FROM cuadre_corte WHERE id_empresa_sucursal = :emp ORDER BY fecha_corte DESC LIMIT 50`,
            { replacements: { emp: id_empresa }, type: QueryTypes.SELECT });
        return rows.map((r: any) => ({ ...r, fecha_corte: new Date(r.fecha_corte).toISOString(), total_lotes: num(r.total_lotes), total_piezas: num(r.total_piezas) }));
    },

    // Compara la existencia de hoy contra: corte + entradas − ventas − otras salidas ocurridas después del corte
    comparar: async (id_empresa: string, id_corte: string) => {
        const corte = await Cuadre_Corte.findOne({ where: { id_cuadre_corte: id_corte, id_empresa_sucursal: id_empresa } });
        if (!corte) throw new Error('No se encontró el corte.');
        const rep = { replacements: { emp: id_empresa, corte: id_corte, desde: corte.fecha_corte }, type: QueryTypes.SELECT as const };

        const [base, stock, movs, inis, lotes] = await Promise.all([
            dbLocal.query<any>(`SELECT id_lote, cantidad FROM cuadre_corte_lote WHERE id_cuadre_corte = :corte`, rep),
            dbLocal.query<any>(`SELECT id_lote, SUM(cantidad) AS e FROM stock_ubicacion_lote WHERE id_empresa_sucursal = :emp GROUP BY id_lote`, rep),
            dbLocal.query<any>(`
                SELECT id_lote, fecha, tipo_movimiento::text AS t, cantidad AS c FROM movimiento_articulo
                WHERE tipo_movimiento IN ('AJUSTE_ENTRADA', 'SALIDA_MERMA', 'SALIDA_ENTREGA') AND id_empresa = :emp AND id_lote IS NOT NULL AND fecha > :desde
                UNION ALL
                SELECT id_lote, fecha, tipo_movimiento::text, cantidad_movimiento FROM kardex_movimientos_articulos
                WHERE tipo_movimiento IN ('ENTRADA', 'SALIDA', 'VENTA') AND id_empresa = :emp AND id_lote IS NOT NULL AND fecha > :desde`, rep),
            dbLocal.query<any>(`
                SELECT id_lote, fecha, cantidad FROM movimiento_articulo
                WHERE tipo_movimiento = 'INICIAL' AND id_empresa = :emp AND id_lote IS NOT NULL AND fecha > :desde`, rep),
            dbLocal.query<any>(`
                SELECT l.id_lote_sucursal AS id, TRIM(l.numero_lote_sucursal) AS lote, a.cod_int_artic AS cod, TRIM(a.des_artic) AS art
                FROM lote_articulo_sucursal l JOIN articulo a ON a.id_artic = l.id_artic WHERE l.id_empre = :emp`, rep),
        ]);

        const basePor = new Map<string, number>(base.map((r: any) => [r.id_lote, num(r.cantidad)]));
        const stockPor = new Map<string, number>(stock.map((r: any) => [r.id_lote, num(r.e)]));
        const movPor = new Map<string, Array<{ f: number; t: string; c: number }>>();
        for (const r of movs) {
            const l = movPor.get(r.id_lote) ?? [];
            l.push({ f: +new Date(r.fecha), t: r.t, c: num(r.c) });
            movPor.set(r.id_lote, l);
        }
        const iniPor = new Map<string, Array<{ f: number; c: number }>>();
        for (const r of inis) {
            const l = iniPor.get(r.id_lote) ?? [];
            l.push({ f: +new Date(r.fecha), c: num(r.cantidad) });
            iniPor.set(r.id_lote, l);
        }

        const out: ILoteCorte[] = [];
        for (const l of lotes) {
            const enCorte = basePor.get(l.id) ?? 0;
            const sistema = stockPor.get(l.id) ?? 0;
            const ms = movPor.get(l.id) ?? [];
            const ini = iniPor.get(l.id);
            if (!basePor.has(l.id) && sistema === 0 && ms.length === 0 && !ini) continue;

            let punto = enCorte, desde = 0, recontado = false;
            if (ini) {
                const ult = Math.max(...ini.map(x => x.f));
                punto = ini.filter(x => x.f === ult).reduce((a, x) => a + x.c, 0);
                desde = ult; recontado = true;
            }
            let entradas = 0, ventas = 0, otras = 0, ultimo = 0;
            for (const m of ms) {
                if (m.f <= desde) continue;
                if (m.f > ultimo) ultimo = m.f;
                if (m.t === 'VENTA') ventas += m.c;
                else if (entra(m.t)) entradas += m.c;
                else otras += m.c;
            }
            const esperada = punto + entradas - ventas - otras;
            const diferencia = sistema - esperada;
            out.push({
                id_lote: l.id, cod_int_artic: l.cod, articulo: l.art, numero_lote: l.lote, en_corte: punto, entradas, ventas, otras_salidas: otras,
                recontado, esperada, sistema, diferencia, estado: diferencia === 0 ? 'CUADRA' : diferencia < 0 ? 'FALTAN' : 'SOBRAN',
                ultimo_movimiento: ultimo ? new Date(ultimo).toISOString() : null,
            });
        }
        // Cambio de lote: si la suma de diferencias de TODOS los lotes del artículo es 0, lo que falta en uno sobra en otro
        const netoPorArticulo = new Map<string, number>();
        for (const l of out) netoPorArticulo.set(String(l.cod_int_artic), (netoPorArticulo.get(String(l.cod_int_artic)) ?? 0) + l.diferencia);
        for (const l of out) {
            if (l.estado !== 'CUADRA' && netoPorArticulo.get(String(l.cod_int_artic)) === 0) l.estado = 'CAMBIO_LOTE';
        }

        // Primero lo que de verdad es fuga; el cambio de lote va al final entre los que no cuadran
        const peso = (e: EstadoFuga) => (e === 'CUADRA' ? 2 : e === 'CAMBIO_LOTE' ? 1 : 0);
        out.sort((a, b) => peso(a.estado) - peso(b.estado)
            || a.diferencia - b.diferencia || String(a.articulo).localeCompare(String(b.articulo)));

        const faltan = out.filter(l => l.estado === 'FALTAN'), sobran = out.filter(l => l.estado === 'SOBRAN'), cambio = out.filter(l => l.estado === 'CAMBIO_LOTE');
        const suma = (xs: ILoteCorte[], k: 'diferencia' | 'sistema' | 'esperada') => xs.reduce((s, x) => s + x[k], 0);
        return {
            corte: { id_cuadre_corte: corte.id_cuadre_corte, nombre: corte.nombre, notas: corte.notas, fecha_corte: corte.fecha_corte.toISOString(), total_lotes: corte.total_lotes, total_piezas: corte.total_piezas },
            generado: new Date().toISOString(),
            totales: {
                lotes_revisados: out.length, lotes_cuadran: out.length - faltan.length - sobran.length - cambio.length,
                lotes_faltan: faltan.length, piezas_faltan: -suma(faltan, 'diferencia'),
                lotes_sobran: sobran.length, piezas_sobran: suma(sobran, 'diferencia'),
                lotes_cambio_lote: cambio.length, piezas_cambio_lote: cambio.filter(l => l.diferencia > 0).reduce((s, l) => s + l.diferencia, 0),
                piezas_sistema: suma(out, 'sistema'), piezas_esperadas: suma(out, 'esperada'),
                entradas: out.reduce((s, x) => s + x.entradas, 0), ventas: out.reduce((s, x) => s + x.ventas, 0),
                otras_salidas: out.reduce((s, x) => s + x.otras_salidas, 0),
            },
            lotes: out.filter(l => l.estado !== 'CUADRA'),
        };
    },

    eliminar: async (id_empresa: string, id_corte: string) => {
        const corte = await Cuadre_Corte.findOne({ where: { id_cuadre_corte: id_corte, id_empresa_sucursal: id_empresa } });
        if (!corte) throw new Error('No se encontró el corte.');
        await dbLocal.transaction(async (t) => {
            await dbLocal.query(`DELETE FROM cuadre_corte_lote WHERE id_cuadre_corte = :id`, { replacements: { id: id_corte }, transaction: t });
            await corte.destroy({ transaction: t });
        });
        return { ok: true };
    },

    generarExcel: async (id_empresa: string, id_corte: string): Promise<Buffer> => {
        const r = await CuadreCorteService.comparar(id_empresa, id_corte);
        const fila = (l: ILoteCorte) => ({
            'Estado': l.estado === 'FALTAN' ? 'FALTAN piezas (posible fuga)' : l.estado === 'CAMBIO_LOTE' ? 'Cambio de lote (neto 0 del artículo)' : 'Sobran piezas', 'Código': l.cod_int_artic, 'Artículo': l.articulo, 'Lote': l.numero_lote,
            [l.recontado ? 'Conteo posterior al corte' : 'Existencia en el corte']: l.en_corte, 'Entradas': l.entradas, 'Ventas': l.ventas, 'Otras salidas': l.otras_salidas,
            'DEBERÍA HABER': l.esperada, 'Dice el sistema': l.sistema, 'Diferencia': l.diferencia,
            'Último movimiento': l.ultimo_movimiento ? l.ultimo_movimiento.slice(0, 16).replace('T', ' ') : '', 'CONTEO FÍSICO': '', 'Notas': '',
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(r.lotes.map(fila));
        ws['!cols'] = [26, 8, 40, 14, 12, 9, 9, 10, 12, 12, 11, 17, 12, 24].map(wch => ({ wch }));
        XLSX.utils.book_append_sheet(wb, ws, 'Fugas');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    },
};
