import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import { dbLocal } from '../../../../config/db';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../../Pedido/repositories/Detalle_Pedido_Almacen.repository';
import { patronBusqueda } from '../../../../utils/busqueda';

// Cotizaciones creadas desde el ERP: un pedido del cliente en estatus CO (En cotización) con sus renglones.
// El agente la ve en la web, en las cotizaciones de ese cliente, igual que las que arma él mismo.

export interface ColumnasExcel {
    codigo: string;       // código interno del artículo
    barras: string;       // código de barras
    descripcion: string;
    piezas: string;
    precio: string;
    filaInicio: number;   // 1 = primer renglón de la hoja
}

export const COLUMNAS_EXCEL_DEFAULT: ColumnasExcel = {
    codigo: 'A', barras: 'B', descripcion: 'C', piezas: 'D', precio: 'E', filaInicio: 2,
};

const txt = (v: any) => String(v ?? '').trim();
const dinero = (v: any): number => {
    const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
};
const letra = (v: any, def: string) => (txt(v) || def).toUpperCase();

export interface FilaExcel {
    fila: number;
    codigo: string;
    barras: string;
    descripcion: string;
    cantidad: number;
    precio_excel: number;
    precio_lista: number | null;
    existencia: number | null;       // disponible en almacén (null si no se pudo calcular)
    articulo: null | { id_artic: string; des_artic: string; cod_barr_artic: string; cod_int_artic: string };
}

// Existencia disponible (lo que hay menos lo apartado por pedidos) por artículo en el almacén de la empresa
async function existenciaDisponible(ids: string[], id_empresa?: string | null): Promise<Map<string, number>> {
    const mapa = new Map<string, number>();
    if (!id_empresa || ids.length === 0) return mapa;
    const filas = await dbLocal.query<any>(`
        SELECT s.id_articulo, COALESCE(SUM(s.cantidad - COALESCE(s.cantidad_apartada, 0)), 0) AS disponible
          FROM stock_ubicacion_lote s
         WHERE s.id_empresa_sucursal = :emp AND s.id_articulo IN (:ids)
         GROUP BY s.id_articulo`,
        { replacements: { emp: id_empresa, ids }, type: QueryTypes.SELECT });
    for (const f of filas) mapa.set(String(f.id_articulo), Number(f.disponible) || 0);
    return mapa;
}

export const CotizacionService = {

    // Clientes por nombre corto, razón social o número interno, con su agente
    buscarClientes: async (q: string) => {
        const termino = txt(q);
        if (termino.length < 2) return [];
        return await dbLocal.query<any>(`
            SELECT c.id_cliente_alm, c.id_interno_cliente_alm, c.nom_corto_cliente_alm, c.razon_social_cliente_alm,
                   c.rfc_cliente_alm, c.id_lista_precio_cliente_alm,
                   NULLIF(TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado)), '') AS agente
              FROM cliente_almacen c
              LEFT JOIN agente_de_venta a ON a.id_agente = c.id_agente_cliente_alm
              LEFT JOIN empleado e ON e.id_empleado = a.id_empleado
             WHERE c.razon_social_cliente_alm ILIKE :q
                OR c.nom_corto_cliente_alm ILIKE :q
                OR c.id_interno_cliente_alm::text = :exacto
             ORDER BY c.razon_social_cliente_alm
             LIMIT 15`,
            { replacements: { q: `%${termino}%`, exacto: termino }, type: QueryTypes.SELECT });
    },

    // Artículos para capturar a mano, con el precio de la lista del cliente
    buscarArticulos: async (q: string, id_cliente: string, id_empresa?: string | null) => {
        const termino = txt(q);
        if (termino.length < 2) return [];
        const filas = await dbLocal.query<any>(`
            SELECT a.id_artic, a.des_artic, trim(a.cod_barr_artic) AS cod_barr_artic, a.cod_int_artic::text AS cod_int_artic,
                   d.precios AS precio_lista
              FROM articulo a
              LEFT JOIN cliente_almacen c ON c.id_cliente_alm = :cli
              LEFT JOIN detalle_lista_precio d ON d.id_artic = a.id_artic AND d.id_lista_precio = c.id_lista_precio_cliente_alm
             WHERE a.des_artic ILIKE :q OR trim(a.cod_barr_artic) = :exacto OR a.cod_int_artic::text = :exacto
             ORDER BY a.des_artic
             LIMIT 15`,
            { replacements: { q: patronBusqueda(termino), exacto: termino, cli: id_cliente || null }, type: QueryTypes.SELECT });
        const ex = await existenciaDisponible(filas.map((f: any) => String(f.id_artic)), id_empresa);
        return filas.map((f: any) => ({ ...f, existencia: id_empresa ? (ex.get(String(f.id_artic)) ?? 0) : null }));
    },

    // Lee un Excel de cotización/pedido (código, código de barras, descripción, piezas, precio) y lo cruza con el catálogo.
    // No guarda nada: devuelve las filas para revisarlas.
    leerExcel: async (params: { buffer: Buffer; id_cliente: string; id_empresa?: string | null; columnas?: Partial<ColumnasExcel> }) => {
        const c = params.columnas ?? {};
        const col: ColumnasExcel = {
            codigo: letra(c.codigo, COLUMNAS_EXCEL_DEFAULT.codigo),
            barras: letra(c.barras, COLUMNAS_EXCEL_DEFAULT.barras),
            descripcion: letra(c.descripcion, COLUMNAS_EXCEL_DEFAULT.descripcion),
            piezas: letra(c.piezas, COLUMNAS_EXCEL_DEFAULT.piezas),
            precio: letra(c.precio, COLUMNAS_EXCEL_DEFAULT.precio),
            filaInicio: Math.max(1, Number(c.filaInicio) || COLUMNAS_EXCEL_DEFAULT.filaInicio),
        };

        let wb: XLSX.WorkBook;
        try {
            wb = XLSX.read(params.buffer, { type: 'buffer' });
        } catch {
            throw new Error('No se pudo leer el archivo: debe ser un Excel (.xlsx).');
        }
        const hoja = wb.Sheets[wb.SheetNames[0]];
        if (!hoja) throw new Error('El Excel no tiene hojas.');
        const data = XLSX.utils.sheet_to_json<any>(hoja, { header: 'A', raw: false, defval: '' });

        const crudas = data
            .map((row, i) => ({ fila: i + 1, row }))
            .filter(x => x.fila >= col.filaInicio)
            .map(({ fila, row }) => ({
                fila,
                codigo: txt(row[col.codigo]),
                barras: txt(row[col.barras]),
                descripcion: txt(row[col.descripcion]),
                cantidad: Math.round(dinero(row[col.piezas])),
                precio_excel: dinero(row[col.precio]),
            }))
            // renglones vacíos o de totales se ignoran
            .filter(x => (x.codigo || x.barras || x.descripcion) && x.cantidad > 0);

        if (crudas.length === 0) {
            throw new Error('No se encontraron renglones con cantidad. Revisa las letras de las columnas y la fila de inicio.');
        }

        // Cruce con el catálogo: primero por código de barras (también sin ceros a la izquierda), luego por código interno
        const barras = Array.from(new Set(crudas.flatMap(x => {
            if (!x.barras) return [];
            const sinCeros = x.barras.replace(/^0+/, '');
            return [x.barras, sinCeros, x.barras.padStart(13, '0')].filter(Boolean);
        })));
        const codigos = Array.from(new Set(crudas.map(x => x.codigo).filter(Boolean)));

        const arts = (barras.length || codigos.length)
            ? await dbLocal.query<any>(`
                SELECT a.id_artic, a.des_artic, trim(a.cod_barr_artic) AS cod_barr_artic, a.cod_int_artic::text AS cod_int_artic
                  FROM articulo a
                 WHERE trim(a.cod_barr_artic) IN (:barras) OR a.cod_int_artic::text IN (:codigos)`,
                { replacements: { barras: barras.length ? barras : [''], codigos: codigos.length ? codigos : [''] }, type: QueryTypes.SELECT })
            : [];
        const porBarras = new Map<string, any>();
        const porCodigo = new Map<string, any>();
        for (const a of arts) {
            if (a.cod_barr_artic) {
                porBarras.set(a.cod_barr_artic, a);
                porBarras.set(a.cod_barr_artic.replace(/^0+/, ''), a);
            }
            if (a.cod_int_artic) porCodigo.set(String(a.cod_int_artic), a);
        }

        // Precio de la lista del cliente (para los renglones sin precio y para avisar diferencias)
        const idsArt = Array.from(new Set(arts.map((a: any) => a.id_artic)));
        const precios = idsArt.length
            ? await dbLocal.query<any>(`
                SELECT d.id_artic, d.precios
                  FROM detalle_lista_precio d
                  JOIN cliente_almacen c ON c.id_lista_precio_cliente_alm = d.id_lista_precio
                 WHERE c.id_cliente_alm = :cli AND d.id_artic IN (:ids)`,
                { replacements: { cli: params.id_cliente, ids: idsArt }, type: QueryTypes.SELECT })
            : [];
        const precioLista = new Map<string, number>(precios.map((p: any) => [String(p.id_artic), Number(p.precios)]));
        const existencias = await existenciaDisponible(idsArt as string[], params.id_empresa);

        const filas: FilaExcel[] = crudas.map(x => {
            const sinCeros = x.barras.replace(/^0+/, '');
            const art = (x.barras && (porBarras.get(x.barras) ?? porBarras.get(sinCeros))) || (x.codigo ? porCodigo.get(x.codigo) : null) || null;
            const pl = art ? precioLista.get(String(art.id_artic)) : undefined;
            return {
                ...x,
                precio_lista: pl !== undefined && pl >= 0.01 ? pl : null,
                existencia: art && params.id_empresa ? (existencias.get(String(art.id_artic)) ?? 0) : null,
                articulo: art
                    ? { id_artic: String(art.id_artic), des_artic: String(art.des_artic ?? '').trim(), cod_barr_artic: art.cod_barr_artic ?? '', cod_int_artic: art.cod_int_artic ?? '' }
                    : null,
            };
        });
        return { columnas: col, filas };
    },

    // Crea la cotización (pedido en estatus CO) con los renglones ya revisados
    crear: async (params: {
        id_cliente: string;
        items: Array<{ id_articulo: string; cantidad: number; precio: number }>;
    }) => {
        const items = Array.isArray(params.items) ? params.items : [];
        if (!params.id_cliente) throw { status: 400, message: 'Falta el cliente.' };
        if (items.length === 0) throw { status: 400, message: 'La cotización no tiene artículos.' };

        for (const it of items) {
            if (!it.id_articulo) throw { status: 400, message: 'Hay renglones sin artículo.' };
            if (!(Number(it.cantidad) >= 1)) throw { status: 400, message: 'Todas las cantidades deben ser de 1 o más.' };
            if (!(Number(it.precio) >= 0.01)) throw { status: 400, message: 'Todos los renglones deben tener precio (mayor a 0).' };
        }

        const [cli] = await dbLocal.query<any>(`
            SELECT c.id_cliente_alm, c.id_agente_cliente_alm, a.cod_identi_agente
              FROM cliente_almacen c
              LEFT JOIN agente_de_venta a ON a.id_agente = c.id_agente_cliente_alm
             WHERE c.id_cliente_alm = :id`,
            { replacements: { id: params.id_cliente }, type: QueryTypes.SELECT }) as any[];
        if (!cli) throw { status: 404, message: 'Cliente no encontrado.' };
        if (!cli.id_agente_cliente_alm || !cli.cod_identi_agente) {
            throw { status: 400, message: 'El cliente no tiene agente asignado: asígnaselo antes de cotizar.' };
        }

        const t = await dbLocal.transaction();
        try {
            const folio = await Pedido_AlmacenRepository.getFolioPedido(String(cli.cod_identi_agente));
            const pedido = await Pedido_AlmacenRepository.create({
                status_pedido_alm: 'CO',
                tipo_pedido_alm: 'AGE',
                id_cliente_pedido_alm: cli.id_cliente_alm,
                id_agente_pedido_alm: cli.id_agente_cliente_alm,
                cod_int_pedido_alm: folio,
            } as any, { transaction: t });

            let total = 0;
            for (const it of items) {
                await Detalle_Pedido_AlmacenRepository.addOrAccumulate({
                    id_pedido_almacen: pedido.id_pedido_alm,
                    id_articulo: it.id_articulo,
                    cantidad: Math.round(Number(it.cantidad)),
                    precio_unitario: Number(it.precio),
                    es_oferta: false,
                } as any, t);
                total += Math.round(Number(it.cantidad)) * Number(it.precio);
            }
            await t.commit();
            return {
                id_pedido_alm: pedido.id_pedido_alm,
                cod_int_pedido_alm: folio,
                partidas: items.length,
                total: Math.round(total * 100) / 100,
            };
        } catch (e) {
            await t.rollback();
            throw e;
        }
    },
};
