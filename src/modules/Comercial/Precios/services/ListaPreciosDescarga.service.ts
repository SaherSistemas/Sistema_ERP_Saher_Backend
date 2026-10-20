import { QueryTypes } from 'sequelize';
import * as XLSX from 'xlsx';
import { dbLocal } from '../../../../config/db';
import { generarPdfListaPrecios, type RenglonListaPrecios } from '../helpers/lista_precios.pdf';

const num = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const fechaHoy = () => new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mazatlan' });

// Listado de una lista de precios (para que el agente lo descargue en PDF o Excel)
export const ListaPreciosDescargaService = {

    // Si quien consulta es un agente de ventas, solo las listas que usan sus clientes activos; los demás usuarios ven todas
    listas: async (id_persona?: string | null) => {
        // El token trae el id del EMPLEADO (así también lo usa "Mis clientes"); se convierte al id del agente
        let id_agente: string | null = null;
        if (id_persona) {
            const [ag] = await dbLocal.query<any>(
                `SELECT id_agente FROM agente_de_venta WHERE id_empleado = :id OR id_agente = :id LIMIT 1`,
                { replacements: { id: id_persona }, type: QueryTypes.SELECT });
            id_agente = ag?.id_agente ?? null;
        }
        const soloDelAgente = !!id_agente;
        const filas = await dbLocal.query<any>(
            `SELECT l.id_lista_precio, l.cod_int_lista_precio, l.nombre_lista_precio
             FROM lista_precio l
             ${soloDelAgente ? `WHERE EXISTS (SELECT 1 FROM cliente_almacen c
                                WHERE c.id_lista_precio_cliente_alm = l.id_lista_precio
                                  AND c.id_agente_cliente_alm = :ag AND c.activo_cliente_alm = true)` : ''}
             ORDER BY l.cod_int_lista_precio`,
            { replacements: { ag: id_agente }, type: QueryTypes.SELECT });
        return filas.map(l => ({
            id_lista_precio: l.id_lista_precio as string,
            cod_int_lista_precio: l.cod_int_lista_precio as number,
            nombre: String(l.nombre_lista_precio ?? '').trim(),
        }));
    },

    // Artículos activos con precio (los de $0.00 se consideran sin precio) Y con existencia en el almacén, ordenados por nombre
    renglones: async (id_lista: string, id_empresa: string) => {
        const [lista] = await dbLocal.query<any>(
            `SELECT nombre_lista_precio FROM lista_precio WHERE id_lista_precio = :id`,
            { replacements: { id: id_lista }, type: QueryTypes.SELECT });
        if (!lista) throw Object.assign(new Error('Lista de precios no encontrada.'), { status: 404 });

        const filas = await dbLocal.query<any>(`
            SELECT a.cod_int_artic, a.cod_barr_artic, a.des_artic, d.precios, COALESCE(i.porcentaje_iva, 0) AS iva, st.existencia
            FROM detalle_lista_precio d
            JOIN articulo a ON a.id_artic = d.id_artic
            JOIN (SELECT id_articulo, SUM(cantidad) AS existencia
                  FROM stock_ubicacion_lote WHERE id_empresa_sucursal = :emp AND cantidad > 0 GROUP BY id_articulo) st
                 ON st.id_articulo = a.id_artic
            LEFT JOIN tipo_iva i ON i.id_iva = a.tipo_de_iva
            WHERE d.id_lista_precio = :id AND d.precios >= 0.01 AND a.status_artic = true AND st.existencia > 0
            ORDER BY a.des_artic ASC`,
            { replacements: { id: id_lista, emp: id_empresa }, type: QueryTypes.SELECT });

        const renglones: RenglonListaPrecios[] = filas.map(f => {
            const precio = r2(num(f.precios));
            // En el catálogo el IVA se guarda como fracción (0.16 = 16%); por si algún registro viniera como 16, también se respeta
            const ivaGuardado = num(f.iva);
            const iva = ivaGuardado > 0 && ivaGuardado <= 1 ? r2(ivaGuardado * 100) : ivaGuardado;
            return {
                codigo: f.cod_int_artic,
                codigo_barras: String(f.cod_barr_artic ?? '').trim(),
                articulo: String(f.des_artic ?? '').trim(),
                precio,
                iva_pct: iva,
                precio_con_iva: r2(precio * (1 + iva / 100)),
                existencia: num(f.existencia),
            };
        });
        return { nombre: String(lista.nombre_lista_precio ?? '').trim(), renglones };
    },

    pdf: async (id_lista: string, id_empresa: string) => {
        const { nombre, renglones } = await ListaPreciosDescargaService.renglones(id_lista, id_empresa);
        const buffer = await generarPdfListaPrecios({ nombre_lista: nombre, fecha: fechaHoy(), renglones });
        return { nombre, buffer };
    },

    excel: async (id_lista: string, id_empresa: string) => {
        const { nombre, renglones } = await ListaPreciosDescargaService.renglones(id_lista, id_empresa);
        const filas: (string | number)[][] = [
            [`LISTA DE PRECIOS · ${nombre}`],
            [`Fecha: ${fechaHoy()}`],
            [],
            ['Código', 'Artículo', 'Código de barras', 'Existencia', 'Precio', 'IVA %', 'Precio con IVA'],
            ...renglones.map(r => [r.codigo, r.articulo, r.codigo_barras, r.existencia, r.precio, r.iva_pct, r.precio_con_iva]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        ws['!cols'] = [{ wch: 9 }, { wch: 60 }, { wch: 18 }, { wch: 11 }, { wch: 12 }, { wch: 8 }, { wch: 15 }];
        ws['!autofilter'] = { ref: `A4:G${filas.length}` };
        // Formato de moneda en precio y precio con IVA (los datos empiezan en la fila 5)
        for (let r = 4; r < filas.length; r++) {
            for (const c of [4, 6]) {
                const celda = ws[XLSX.utils.encode_cell({ r, c })];
                if (celda) celda.z = '"$"#,##0.00';
            }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lista de precios');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
        return { nombre, buffer };
    },
};
