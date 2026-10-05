import { Op, QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../config/db';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import Empleado from '../../RRHH/model/Empleado';
import { Pedido_AlmacenRepository } from '../../Almacen/Pedido/repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../../Almacen/Pedido/repositories/Detalle_Pedido_Almacen.repository';
import Cat_Status_Pedido_Almacen from '../../Almacen/Pedido/model/Cat_Status_Pedido_Almacen';
import { FacturacionRepository } from '../../Facturas/repositories/Facturacion.repository';
import { FacturacionService } from '../../Facturas/services/Facturacion.service';

// ── Quincenas de nómina ──────────────────────────────────────────────────────
// El crédito de vales es POR QUINCENA: del 1 al 15 y del 16 al fin de mes (si el límite es 500, son 500 en cada
// una). Un vale se descuenta en la nómina que sigue a su quincena: los del 1-15 se cobran a fin de mes y los del
// 16-fin se cobran el 15 del mes siguiente. Todo se calcula con la fecha LOCAL del vale (no UTC) para que uno
// hecho en la tarde-noche no caiga en la quincena equivocada. No se guarda nada nuevo: se deriva de la fecha.
const TZ = 'America/Mazatlan';
const HOY_SQL = `(NOW() AT TIME ZONE '${TZ}')::date`;
const mesIni = (f: string) => `date_trunc('month', ${f})::date`;
const iniQuincenaSql = (f: string) =>
    `(CASE WHEN EXTRACT(DAY FROM ${f}) <= 15 THEN ${mesIni(f)} ELSE ${mesIni(f)} + 15 END)`;
const finQuincenaSql = (f: string) =>
    `(CASE WHEN EXTRACT(DAY FROM ${f}) <= 15 THEN ${mesIni(f)} + 14 ELSE (${mesIni(f)} + INTERVAL '1 month')::date - 1 END)`;
// Fecha de la nómina donde se descuenta: 1-15 → último día del mes · 16-fin → día 15 del mes siguiente
const fechaDescuentoSql = (f: string) =>
    `(CASE WHEN EXTRACT(DAY FROM ${f}) <= 15 THEN (${mesIni(f)} + INTERVAL '1 month')::date - 1 ELSE (${mesIni(f)} + INTERVAL '1 month')::date + 14 END)`;
const fechaValeSql = (alias: string) => `(${alias}."createdAt" AT TIME ZONE '${TZ}')::date`;
// Total del vale CON IVA: el precio de venta es antes de IVA y la factura le suma la tasa de cada artículo (0%
// en la mayoría de medicamentos, 16% en otros). Es lo que el empleado paga, así que es lo que cuenta para el
// límite y para el descuento de nómina. El IVA se redondea por renglón, igual que en la factura.
const lineaConIvaSql = (dpa: string, ti: string) =>
    `ROUND(${dpa}.precio_venta * ${dpa}.cant_pedida, 2) + ROUND(${dpa}.precio_venta * ${dpa}.cant_pedida * COALESCE(CAST(${ti}.porcentaje_iva AS NUMERIC), 0), 2)`;
const totalValeSql = (alias: string) =>
    `(SELECT COALESCE(SUM(${lineaConIvaSql('dv', 'tv')}), 0)
        FROM detalle_pedido_almacen dv
        JOIN articulo av ON av.id_artic = dv.id_articulo
        LEFT JOIN tipo_iva tv ON tv.id_iva = av.tipo_de_iva
       WHERE dv.id_pedido_almacen = ${alias}.id_pedido_alm)`;
// Cuentan para el límite de la quincena todos los vales que llegaron a existir, estén cobrados o no
const STATUS_NO_CUENTAN = `('EC', 'CO', 'NE', 'CN')`;
const fmtFechaCorta = (iso: string) => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

export const ValeService = {

    // ── Seed: insertar status PF si no existe ────────────────────────────────
    seedStatusPF: async () => {
        await Cat_Status_Pedido_Almacen.findOrCreate({
            where: { id_status_pedido_almacen: 'PF' },
            defaults: { descrip_almacen: 'Pendiente de Facturar', orden: 7, activo: true } as any,
        });
    },

    // ── Marcar vales como PF y descontar saldo al empleado ───────────────────
    marcarComoPF: async (ids_pedidos: string[]) => {
        if (!ids_pedidos.length) throw new Error('No se enviaron pedidos');

        // Calcular total por empleado de los vales seleccionados
        const totales = await dbLocal.query<{ id_empleado_vale: string; total: string }>(`
            SELECT pa.id_empleado_vale,
                   COALESCE(SUM(${totalValeSql('pa')}), 0) AS total
            FROM pedido_almacen pa
            WHERE pa.id_pedido_alm IN (:ids)
              AND pa.origen_pedido = 'VALE'
              AND pa.status_pedido_alm IN ('CH', 'EN')
            GROUP BY pa.id_empleado_vale
        `, { type: QueryTypes.SELECT, replacements: { ids: ids_pedidos } });

        const [updated] = await Pedido_Almacen.update(
            { status_pedido_alm: 'PF' },
            { where: { id_pedido_alm: { [Op.in]: ids_pedidos }, origen_pedido: 'VALE', status_pedido_alm: { [Op.in]: ['CH', 'EN'] } } }
        );

        // Descontar saldo de cada empleado involucrado
        for (const row of totales) {
            const monto = parseFloat(row.total);
            if (monto <= 0) continue;
            const emp = await Empleado.findByPk(row.id_empleado_vale);
            if (!emp) continue;
            const nuevo = Math.max(0, Number(emp.saldo_vale_actual) - monto);
            await Empleado.update({ saldo_vale_actual: nuevo }, { where: { id_empleado: row.id_empleado_vale } });
        }

        return { actualizados: updated };
    },

    // ── Total de un vale con IVA (subtotal + IVA de cada artículo según su tasa) ─
    calcularTotalVale: async (articulos: { id_articulo: string; cantidad: number; precio_unitario: number }[]) => {
        if (!articulos.length) return { subtotal: 0, iva: 0, total: 0, lineas: [] as { id_articulo: string; subtotal: number; iva: number; tasa_iva: number }[] };
        const tasas = await dbLocal.query<{ id_artic: string; tasa: string }>(`
            SELECT a.id_artic, COALESCE(CAST(ti.porcentaje_iva AS NUMERIC), 0) AS tasa
            FROM articulo a
            LEFT JOIN tipo_iva ti ON ti.id_iva = a.tipo_de_iva
            WHERE a.id_artic IN (:ids)
        `, { type: QueryTypes.SELECT, replacements: { ids: articulos.map(a => a.id_articulo) } });
        const mapa = new Map(tasas.map(t => [t.id_artic, Number(t.tasa)]));

        let subtotal = 0;
        let iva = 0;
        const lineas = articulos.map(a => {
            const tasa = mapa.get(a.id_articulo) ?? 0;
            const sub = +(Number(a.cantidad) * Number(a.precio_unitario)).toFixed(2);
            const ivaLinea = +(sub * tasa).toFixed(2);
            subtotal += sub;
            iva += ivaLinea;
            return { id_articulo: a.id_articulo, subtotal: sub, iva: ivaLinea, tasa_iva: tasa };
        });
        return { subtotal: +subtotal.toFixed(2), iva: +iva.toFixed(2), total: +(subtotal + iva).toFixed(2), lineas };
    },

    // ── Crear vale ───────────────────────────────────────────────────────────
    crearVale: async (dto: {
        id_empleado: string;
        id_agente: string;
        id_empresa: string;
        articulos: {
            id_articulo: string;
            cantidad: number;
            precio_unitario: number;
        }[];
    }) => {
        const empleado = await Empleado.findByPk(dto.id_empleado);
        if (!empleado) throw new Error('Empleado no encontrado');

        // Total CON IVA (el precio es antes de IVA; ver calcularTotalVale)
        const totalVale = (await ValeService.calcularTotalVale(dto.articulos)).total;

        // Crédito de la QUINCENA actual: lo ya consumido en vales hechos del 1 al 15 (o del 16 al fin de mes),
        // estén cobrados o no. Al empezar otra quincena el límite se vuelve a tener completo.
        const [q] = await dbLocal.query<{ consumido: string; ini: string; fin: string; fecha_descuento: string }>(`
            SELECT COALESCE(SUM(${totalValeSql('pa')}), 0)              AS consumido,
                   ${iniQuincenaSql(HOY_SQL)}::text                     AS ini,
                   ${finQuincenaSql(HOY_SQL)}::text                     AS fin,
                   ${fechaDescuentoSql(HOY_SQL)}::text                  AS fecha_descuento
            FROM pedido_almacen pa
            WHERE pa.id_empleado_vale = :id_empleado
              AND pa.origen_pedido = 'VALE'
              AND pa.status_pedido_alm NOT IN ${STATUS_NO_CUENTAN}
              AND ${fechaValeSql('pa')} BETWEEN ${iniQuincenaSql(HOY_SQL)} AND ${finQuincenaSql(HOY_SQL)}
        `, { type: QueryTypes.SELECT, replacements: { id_empleado: dto.id_empleado } });

        const limite      = Number(empleado.limite_credito_vale);
        const consumido   = parseFloat(q?.consumido ?? '0');
        const disponible  = limite - consumido;
        if (totalVale > disponible) {
            throw new Error(
                `El vale ($${totalVale.toFixed(2)}) supera el crédito disponible de esta quincena ($${Math.max(0, disponible).toFixed(2)}). ` +
                `Límite por quincena: $${limite.toFixed(2)} · ya consumido del ${fmtFechaCorta(q.ini)} al ${fmtFechaCorta(q.fin)}: $${consumido.toFixed(2)}.`
            );
        }

        const t = await dbLocal.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED });
        try {
            // Folio interno: VALE-{iniciales empleado}-{secuencial}
            const iniciales = `${empleado.nombre_empleado[0]}${empleado.ap_pat_empleado[0]}`.toUpperCase();
            const ultimo = await Pedido_Almacen.findOne({
                where: { origen_pedido: 'VALE' },
                order: [['createdAt', 'DESC']],
                attributes: ['cod_int_pedido_alm'],
                transaction: t,
            });
            const secuencial = ultimo
                ? (parseInt(ultimo.cod_int_pedido_alm.split('-').pop() ?? '0', 10) + 1)
                : 1;
            const cod_int = `VALE-${iniciales}-${String(secuencial).padStart(5, '0')}`;

            const pedido = await Pedido_Almacen.create({
                cod_int_pedido_alm: cod_int,
                fecha_max_entrega_alm: new Date(), // Se puede ajustar si se quiere permitir fecha futura
                status_pedido_alm: 'CA',
                tipo_pedido_alm: 'VAL',
                id_cliente_pedido_alm: null,
                id_agente_pedido_alm: dto.id_agente,
                origen_pedido: 'VALE',
                id_empleado_vale: dto.id_empleado,
            }, { transaction: t });

            for (const art of dto.articulos) {
                await Detalle_Pedido_AlmacenRepository.addOrAccumulate({
                    id_pedido_almacen: pedido.id_pedido_alm,
                    id_articulo: art.id_articulo,
                    cantidad: art.cantidad,
                    precio_unitario: art.precio_unitario,
                    es_oferta: false,
                }, t);
            }

            await t.commit();
            return pedido;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    // ── Cuando el vale se chequea → sumar al saldo del empleado ─────────────
    aplicarSaldoAlChequear: async (id_pedido_alm: string) => {
        const pedido = await Pedido_Almacen.findByPk(id_pedido_alm);
        if (!pedido || pedido.origen_pedido !== 'VALE' || !pedido.id_empleado_vale) return;

        // Calcular total del vale sumando detalles chequeados
        const rows = await dbLocal.query<{ total: string }>(`
            SELECT COALESCE(SUM(
                ROUND(dpac.cant_chequeada * dpa.precio_venta, 2)
                + ROUND(dpac.cant_chequeada * dpa.precio_venta * COALESCE(CAST(ti.porcentaje_iva AS NUMERIC), 0), 2)
            ), 0) AS total
            FROM detalle_pedido_almacen      dpa
            JOIN detalle_pedido_almacen_chequeo dpac ON dpac.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
            JOIN articulo ar ON ar.id_artic = dpa.id_articulo
            LEFT JOIN tipo_iva ti ON ti.id_iva = ar.tipo_de_iva
            WHERE dpa.id_pedido_almacen = :id_pedido_alm
        `, { type: QueryTypes.SELECT, replacements: { id_pedido_alm } });

        const totalVale = parseFloat(rows[0]?.total ?? '0');
        if (totalVale <= 0) return;

        await Empleado.increment('saldo_vale_actual', {
            by: totalVale,
            where: { id_empleado: pedido.id_empleado_vale },
        });
    },

    // ── Listado de vales pendientes de facturar ──────────────────────────────
    getValesPorPeriodo: async (fecha_inicio: string, fecha_fin: string, id_empresa: string) => {
        const rows = await dbLocal.query<{
            id_pedido_alm: string;
            cod_int_pedido_alm: string;
            status_pedido_alm: string;
            nombre_empleado: string;
            ap_pat_empleado: string;
            createdAt: string;
            subtotal_vale: string;
            iva_vale: string;
            total_vale: string;
        }>(`
            SELECT
                pa.id_pedido_alm,
                pa.cod_int_pedido_alm,
                pa.status_pedido_alm,
                e.nombre_empleado,
                e.ap_pat_empleado,
                pa."createdAt",
                COALESCE(SUM(ROUND(dpac.cant_chequeada * dpa.precio_venta, 2)), 0) AS subtotal_vale,
                COALESCE(SUM(ROUND(dpac.cant_chequeada * dpa.precio_venta * COALESCE(CAST(ti.porcentaje_iva AS NUMERIC), 0), 2)), 0) AS iva_vale,
                -- Total a descontar al empleado = subtotal + IVA (lo mismo que lleva la factura)
                COALESCE(SUM(
                    ROUND(dpac.cant_chequeada * dpa.precio_venta, 2)
                    + ROUND(dpac.cant_chequeada * dpa.precio_venta * COALESCE(CAST(ti.porcentaje_iva AS NUMERIC), 0), 2)
                ), 0) AS total_vale
            FROM pedido_almacen pa
            JOIN empleado       e   ON e.id_empleado   = pa.id_empleado_vale
            JOIN empresa_sucursal es ON es.id_empre    = :id_empresa
            LEFT JOIN detalle_pedido_almacen dpa        ON dpa.id_pedido_almacen = pa.id_pedido_alm
            LEFT JOIN detalle_pedido_almacen_chequeo dpac ON dpac.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
            LEFT JOIN articulo  ar  ON ar.id_artic     = dpa.id_articulo
            LEFT JOIN tipo_iva  ti  ON ti.id_iva       = ar.tipo_de_iva
            WHERE pa.origen_pedido = 'VALE'
              AND pa.status_pedido_alm = 'PF'
              AND pa."createdAt"::date BETWEEN :fecha_inicio AND :fecha_fin
            GROUP BY pa.id_pedido_alm, pa.cod_int_pedido_alm, pa.status_pedido_alm,
                     e.nombre_empleado, e.ap_pat_empleado, pa."createdAt"
            ORDER BY pa."createdAt" ASC
        `, { type: QueryTypes.SELECT, replacements: { fecha_inicio, fecha_fin, id_empresa } });

        return rows;
    },

    // ── Deuda actual por empleado ────────────────────────────────────────────
    getDeudaEmpleados: async (id_empresa: string, fecha_inicio?: string, fecha_fin?: string) => {
        const rows = await dbLocal.query<{
            id_empleado:         string;
            idinterno_empleado:  number;
            nombre_empleado:     string;
            ap_pat_empleado:     string;
            ap_mat_empleado:     string;
            limite_credito_vale: string;
            saldo_vale_actual:   string;
            total_vales_activos: string;
            consumido_quincena:  string;
            quincena_inicio:     string;
            quincena_fin:        string;
            fecha_descuento_nuevo: string;
        }>(`
            SELECT
                e.id_empleado,
                e.idinterno_empleado,
                e.nombre_empleado,
                e.ap_pat_empleado,
                e.ap_mat_empleado,
                e.limite_credito_vale,
                -- DEUDA: vales chequeados, empacados y entregados (CH, EM, EN) que aún no se cobran.
                -- (Se calcula de los vales; el campo guardado en el empleado no se mantiene.)
                COALESCE(SUM(CASE WHEN pa.status_pedido_alm IN ('CH', 'EM', 'EN') THEN
                    ${totalValeSql('pa')}
                END), 0) AS saldo_vale_actual,
                -- En proceso: capturados y surtiendo (todavía sin chequear)
                COALESCE(SUM(CASE WHEN pa.status_pedido_alm IN ('CA', 'SU') THEN
                    ${totalValeSql('pa')}
                END), 0) AS total_vales_activos,
                -- Crédito de la QUINCENA actual: vales hechos del 1-15 (o 16-fin), cobrados o no
                (SELECT COALESCE(SUM(${totalValeSql('q')}), 0)
                   FROM pedido_almacen q
                  WHERE q.id_empleado_vale = e.id_empleado AND q.origen_pedido = 'VALE'
                    AND q.status_pedido_alm NOT IN ${STATUS_NO_CUENTAN}
                    AND ${fechaValeSql('q')} BETWEEN ${iniQuincenaSql(HOY_SQL)} AND ${finQuincenaSql(HOY_SQL)}
                ) AS consumido_quincena,
                ${iniQuincenaSql(HOY_SQL)}::text       AS quincena_inicio,
                ${finQuincenaSql(HOY_SQL)}::text       AS quincena_fin,
                ${fechaDescuentoSql(HOY_SQL)}::text    AS fecha_descuento_nuevo
            FROM empleado e
            LEFT JOIN pedido_almacen pa ON pa.id_empleado_vale = e.id_empleado
                AND pa.origen_pedido = 'VALE'
                AND pa.status_pedido_alm IN ('CA', 'SU', 'CH', 'EM', 'EN')
                ${fecha_inicio ? `AND pa."createdAt"::date >= :fecha_inicio` : ''}
                ${fecha_fin    ? `AND pa."createdAt"::date <= :fecha_fin`    : ''}
            WHERE e.id_sucursal_empleado = :id_empresa
              AND e.estatus_empleado = true
            GROUP BY e.id_empleado, e.idinterno_empleado, e.nombre_empleado,
                     e.ap_pat_empleado, e.ap_mat_empleado,
                     e.limite_credito_vale
            ORDER BY e.ap_pat_empleado ASC
        `, { type: QueryTypes.SELECT, replacements: { id_empresa, fecha_inicio, fecha_fin } });

        return rows;
    },

    // ── Vales activos de un empleado (con artículos) ─────────────────────────
    getValesActivosEmpleado: async (id_empleado: string, fecha_inicio?: string, fecha_fin?: string) => {
        const rows = await dbLocal.query<{
            id_pedido_alm:      string;
            cod_int_pedido_alm: string;
            status_pedido_alm:  string;
            createdAt:          string;
            total:              string;
            id_detalle:         string;
            descripcion:        string;
            cant_pedida:        number;
            precio_venta:       number;
            tasa_iva:           string;
            fecha_descuento:    string;
        }>(`
            SELECT
                pa.id_pedido_alm,
                pa.cod_int_pedido_alm,
                pa.status_pedido_alm,
                pa."createdAt",
                ${totalValeSql('pa')} AS total,
                dpa.id_detalle_pedido_almacen AS id_detalle,
                a.des_artic                   AS descripcion,
                dpa.cant_pedida,
                dpa.precio_venta,
                COALESCE(CAST(ti.porcentaje_iva AS NUMERIC), 0) AS tasa_iva,
                ${fechaDescuentoSql(fechaValeSql('pa'))}::text AS fecha_descuento
            FROM pedido_almacen pa
            JOIN detalle_pedido_almacen dpa ON dpa.id_pedido_almacen = pa.id_pedido_alm
            JOIN articulo a                  ON a.id_artic = dpa.id_articulo
            LEFT JOIN tipo_iva ti            ON ti.id_iva = a.tipo_de_iva
            WHERE pa.id_empleado_vale = :id_empleado
              AND pa.origen_pedido    = 'VALE'
              AND pa.status_pedido_alm != 'FA'
              ${fecha_inicio ? `AND pa."createdAt"::date >= :fecha_inicio` : ''}
              ${fecha_fin    ? `AND pa."createdAt"::date <= :fecha_fin`    : ''}
            ORDER BY pa."createdAt" DESC, a.des_artic ASC
        `, { type: QueryTypes.SELECT, replacements: { id_empleado, fecha_inicio, fecha_fin } });

        // Agrupar por pedido
        const map = new Map<string, {
            id_pedido_alm: string; cod_int_pedido_alm: string;
            status_pedido_alm: string; createdAt: string; total: string; fecha_descuento: string;
            articulos: { descripcion: string; cant_pedida: number; precio_venta: number; tasa_iva: number }[];
        }>();
        for (const r of rows) {
            if (!map.has(r.id_pedido_alm)) {
                map.set(r.id_pedido_alm, {
                    id_pedido_alm:      r.id_pedido_alm,
                    cod_int_pedido_alm: r.cod_int_pedido_alm,
                    status_pedido_alm:  r.status_pedido_alm,
                    createdAt:          r.createdAt,
                    total:              r.total,
                    fecha_descuento:    r.fecha_descuento,
                    articulos: [],
                });
            }
            map.get(r.id_pedido_alm)!.articulos.push({
                descripcion:  r.descripcion,
                cant_pedida:  r.cant_pedida,
                precio_venta: r.precio_venta,
                tasa_iva:     Number(r.tasa_iva),
            });
        }
        return [...map.values()];
    },

    // ── Actualizar límite de crédito de un empleado ──────────────────────────
    actualizarLimiteCredito: async (id_empleado: string, limite: number) => {
        await Empleado.update(
            { limite_credito_vale: limite },
            { where: { id_empleado } }
        );
    },

    // ── Descontar monto del saldo de un empleado (pago de nómina) ────────────
    descontarSaldo: async (id_empleado: string, monto: number) => {
        const emp = await Empleado.findByPk(id_empleado);
        if (!emp) throw new Error('Empleado no encontrado');
        const nuevo = Math.max(0, Number(emp.saldo_vale_actual) - monto);
        await Empleado.update({ saldo_vale_actual: nuevo }, { where: { id_empleado } });


        return { saldo_vale_actual: nuevo };
    },

    // ── Consolidar vales del período → 1 CFDI Público General ───────────────
    consolidarVales: async (dto: {
        fecha_inicio: string;
        fecha_fin: string;
        id_empresa: string;
        id_empleado_factura: string;
    }) => {
        // 1. Obtener todos los vales chequeados del período
        const filas = await dbLocal.query<{
            id_pedido_alm: string;
            cod_int_pedido_alm: string;
            id_articulo: string;
            cve_sat: string;
            sat_medida: string;
            desc_medida: string;
            descripcion: string;
            precio_unitario: number;
            tasa_iva: number;
            impuesto_sat: string;
            tipo_factor: string;
            lote: string | null;
            fecha_venci: string | null;
            cant_lote: number;
        }>(`
            SELECT
                pa.id_pedido_alm,
                pa.cod_int_pedido_alm,
                a.id_artic                           AS id_articulo,
                a.satclave_artic                     AS cve_sat,
                um.sat_medida,
                um.descrip_medida                    AS desc_medida,
                a.des_artic                          AS descripcion,
                dpa.precio_venta                     AS precio_unitario,
                CAST(ti.porcentaje_iva AS NUMERIC)   AS tasa_iva,
                ti.impuesto_sat,
                ti.tipo_factor,
                COALESCE(las.numero_lote_sucursal,   dpal.lote_factura_numero) AS lote,
                COALESCE(las.fecha_venci_lote_sucursal::text, dpal.lote_factura_fecha::text) AS fecha_venci,
                dpac.cant_chequeada                  AS cant_lote
            FROM pedido_almacen pa
            JOIN detalle_pedido_almacen dpa
                ON dpa.id_pedido_almacen = pa.id_pedido_alm
            JOIN detalle_pedido_almacen_chequeo dpac
                ON dpac.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
            JOIN articulo a   ON a.id_artic   = dpa.id_articulo
            JOIN unidadmedida um ON um.id_medida = a.unidmedi_artic
            JOIN tipo_iva ti  ON ti.id_iva    = a.tipo_de_iva
            LEFT JOIN detalle_pedido_almacen_lote dpal
                ON dpal.id_detalle_pedido_almacen_lote = dpac.id_detalle_pedido_almacen_lote
            LEFT JOIN lote_articulo_sucursal las
                ON las.id_lote_sucursal = dpal.id_lote_sucursal
            WHERE pa.origen_pedido   = 'VALE'
              AND pa.status_pedido_alm = 'PF'
              AND pa."createdAt"::date BETWEEN :fecha_inicio AND :fecha_fin
            ORDER BY pa.id_pedido_alm, a.id_artic, dpa.precio_venta
        `, { type: QueryTypes.SELECT, replacements: { fecha_inicio: dto.fecha_inicio, fecha_fin: dto.fecha_fin } });

        if (!filas.length) throw new Error('No hay vales chequeados en el período indicado');

        // Agrupar por artículo+precio → sumar cantidades y acumular lotes
        type KeyConcepto = string;
        const mapConceptos = new Map<KeyConcepto, {
            id_pedido_alm: string; cod_int_pedido_alm: string;
            id_articulo: string; cve_sat: string; sat_medida: string; desc_medida: string;
            descripcion: string; cantidad: number; precio_unitario: number;
            tasa_iva: number; impuesto_sat: string; tipo_factor: string;
            lotes: { lote: string; fecha_venci: string; cantidad: number }[];
        }>();

        for (const f of filas) {
            const key: KeyConcepto = `${f.id_articulo}|${f.precio_unitario}`;
            if (!mapConceptos.has(key)) {
                mapConceptos.set(key, {
                    id_pedido_alm: f.id_pedido_alm, cod_int_pedido_alm: f.cod_int_pedido_alm,
                    id_articulo: f.id_articulo, cve_sat: f.cve_sat,
                    sat_medida: f.sat_medida, desc_medida: f.desc_medida,
                    descripcion: f.descripcion, cantidad: 0,
                    precio_unitario: Number(f.precio_unitario),
                    tasa_iva: Number(f.tasa_iva), impuesto_sat: f.impuesto_sat,
                    tipo_factor: f.tipo_factor, lotes: [],
                });
            }
            const c = mapConceptos.get(key)!;
            const cant = Number(f.cant_lote);
            c.cantidad += cant;
            if (f.lote) {
                const existing = c.lotes.find(l => l.lote === f.lote && l.fecha_venci === (f.fecha_venci ?? ''));
                if (existing) {
                    existing.cantidad += cant;
                } else {
                    c.lotes.push({ lote: f.lote, fecha_venci: f.fecha_venci ?? '', cantidad: cant });
                }
            }
        }

        const vales = [...mapConceptos.values()];
        const ids_pedidos = [...new Set(filas.map(f => f.id_pedido_alm))];

        // 3. Timbrar — sin cliente (vales van a RFC Público General, no a un cliente del sistema)
        const factura = await FacturacionService.timbrarConsolidadoVales({
            id_empresa: dto.id_empresa,
            id_empleado: dto.id_empleado_factura,
            id_cliente_alm: null,
            ids_pedidos,
            conceptos: vales.map(v => ({
                id_articulo: v.id_articulo,
                cve_sat: v.cve_sat,
                sat_medida: v.sat_medida,
                desc_medida: v.desc_medida,
                descripcion: v.descripcion,
                cantidad: v.cantidad,
                precio_unitario: v.precio_unitario,
                descuento: 0,
                subtotal_linea: v.cantidad * v.precio_unitario,
                tasa_iva: v.tasa_iva,
                impuesto_sat: v.impuesto_sat,
                tipo_factor: v.tipo_factor,
                necesita_receta: false,
                cod_int_artic: 0,
                cod_barras: '',
                lotes: v.lotes.map(l => ({ ...l, folio_factura_proveedor: '', nom_proveedor: '' })),
            })),
            periodo: `${dto.fecha_inicio} al ${dto.fecha_fin}`,
        });

        // 4. Marcar vales como facturados
        await Pedido_Almacen.update(
            { status_pedido_alm: 'FA', fecha_facturado_pedido_alm: new Date() },
            { where: { id_pedido_alm: { [Op.in]: ids_pedidos } } }
        );

        return factura;
    },
};
