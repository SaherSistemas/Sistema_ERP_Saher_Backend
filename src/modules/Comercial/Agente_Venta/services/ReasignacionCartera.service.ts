import { QueryTypes, Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';

/*
    REASIGNACIÓN DE CARTERA (un agente se da de baja y sus clientes pasan a otros agentes)

    El agente de un cliente vive en 3 lugares:
      - cliente_almacen.id_agente_cliente_alm   → de aquí salen sus deudas en Cuentas por Cobrar y sus pedidos nuevos
      - pedido_almacen.id_agente_pedido_alm     → cada pedido (las facturas lo toman del pedido)
      - remision.id_agente                      → cada remisión (flujo Público General)

    Alcance "cartera viva": se pasa el cliente + lo que sigue abierto. Lo ya pagado y cerrado se queda con el agente
    que se va (sus comisiones y su historial de ventas no cambian).
      1. El cliente.
      2. Pedidos abiertos (aún sin facturar): capturados, en surtido, chequeo, empaque y cotizaciones.
      3. Pedidos cuyas facturas/remisiones todavía tienen saldo en Cuentas por Cobrar (+ esas remisiones).
      4. Devoluciones del cliente todavía pendientes de aprobar.
    NO se mueve: el inventario virtual del agente (son piezas que él tiene físicamente; se recibe en almacén aparte).
*/

// Pedidos "abiertos": los mismos estatus que el sistema permite todavía modificar
const ESTATUS_PEDIDO_ABIERTO = ['EC', 'CO', 'CA', 'SU', 'CH', 'EM'];

// Saldo mínimo para considerar que una cuenta por cobrar sigue abierta (ignora centavos de redondeo)
const SALDO_MINIMO = 0.009;

export interface IAsignacionCliente {
    id_cliente_alm: string;
    id_agente_destino: string;
}

export interface IResumenDestino {
    id_agente_destino: string;
    agente: string | null;
    clientes: number;
    pedidos_abiertos: number;
    pedidos_con_deuda: number;
    remisiones_con_deuda: number;
    devoluciones_pendientes: number;
}

// Filas afectadas de un UPDATE crudo (Postgres: [undefined, filas])
const filasAfectadas = (r: any): number => Number(Array.isArray(r) ? r[1] ?? 0 : 0);

export const ReasignacionCarteraService = {

    // ── Clientes del agente con lo que se movería con cada uno ───────────────
    cartera: async (id_agente: string) => {
        const agente = await dbLocal.query<any>(`
            SELECT a.id_agente, a.cod_identi_agente, a.estatus_agente,
                   TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado)) AS nombre
            FROM agente_de_venta a
            LEFT JOIN empleado e ON e.id_empleado = a.id_empleado
            WHERE a.id_agente = :id
        `, { replacements: { id: id_agente }, type: QueryTypes.SELECT });
        if (!agente[0]) throw { status: 404, message: 'Agente no encontrado.' };

        const clientes = await dbLocal.query<any>(`
            SELECT c.id_cliente_alm, c.nom_corto_cliente_alm AS nom_corto, c.razon_social_cliente_alm AS razon_social,
                   c.activo_cliente_alm AS activo,
                   (SELECT COUNT(*) FROM pedido_almacen p
                     WHERE p.id_cliente_pedido_alm = c.id_cliente_alm AND p.id_agente_pedido_alm = :id
                       AND p.status_pedido_alm IN (:abiertos) AND p.fecha_facturado_pedido_alm IS NULL)::int AS pedidos_abiertos,
                   (SELECT COUNT(*) FROM cuenta_por_cobrar x
                     WHERE x.id_cliente_alm = c.id_cliente_alm AND x.saldo_pendiente > :minimo)::int AS cuentas_con_saldo,
                   (SELECT COALESCE(SUM(x.saldo_pendiente), 0) FROM cuenta_por_cobrar x
                     WHERE x.id_cliente_alm = c.id_cliente_alm AND x.saldo_pendiente > :minimo)::float AS saldo_pendiente,
                   (SELECT COUNT(*) FROM devolucion_cliente d
                      JOIN facturas f ON f.id_factura = d.id_factura
                     WHERE f.id_cliente_alm = c.id_cliente_alm AND d.id_agente = :id AND d.estatus = 'PENDIENTE')::int AS devoluciones_pendientes
            FROM cliente_almacen c
            WHERE c.id_agente_cliente_alm = :id
            ORDER BY c.activo_cliente_alm DESC, c.nom_corto_cliente_alm
        `, { replacements: { id: id_agente, abiertos: ESTATUS_PEDIDO_ABIERTO, minimo: SALDO_MINIMO }, type: QueryTypes.SELECT });

        const [virtual] = await dbLocal.query<any>(`
            SELECT COALESCE(SUM(cantidad), 0)::int AS piezas
            FROM agente_inventario_virtual WHERE id_agente = :id AND estatus = 'EN_AGENTE'
        `, { replacements: { id: id_agente }, type: QueryTypes.SELECT });

        return {
            agente: agente[0],
            clientes,
            inventario_virtual_piezas: Number(virtual?.piezas ?? 0),
        };
    },

    // ── Reasignar: cada cliente a su agente destino (todo en una sola transacción) ──
    reasignar: async (id_agente_origen: string, asignaciones: IAsignacionCliente[], usuario: string) => {
        if (!id_agente_origen) throw { status: 400, message: 'Falta el agente de origen.' };
        if (!Array.isArray(asignaciones) || asignaciones.length === 0) {
            throw { status: 400, message: 'No hay clientes por reasignar.' };
        }

        const vistos = new Set<string>();
        for (const a of asignaciones) {
            if (!a?.id_cliente_alm || !a?.id_agente_destino) throw { status: 400, message: 'Cada cliente necesita su agente destino.' };
            if (a.id_agente_destino === id_agente_origen) throw { status: 400, message: 'El agente destino no puede ser el mismo que se da de baja.' };
            if (vistos.has(a.id_cliente_alm)) throw { status: 400, message: 'Hay un cliente repetido en la lista.' };
            vistos.add(a.id_cliente_alm);
        }

        // Agrupar por destino
        const porDestino = new Map<string, string[]>();
        for (const a of asignaciones) {
            if (!porDestino.has(a.id_agente_destino)) porDestino.set(a.id_agente_destino, []);
            porDestino.get(a.id_agente_destino)!.push(a.id_cliente_alm);
        }

        // Los destinos deben existir y estar activos
        const destinos = await dbLocal.query<any>(`
            SELECT a.id_agente, a.estatus_agente,
                   TRIM(CONCAT_WS(' ', e.nombre_empleado, e.ap_pat_empleado, e.ap_mat_empleado)) AS nombre
            FROM agente_de_venta a LEFT JOIN empleado e ON e.id_empleado = a.id_empleado
            WHERE a.id_agente IN (:ids)
        `, { replacements: { ids: Array.from(porDestino.keys()) }, type: QueryTypes.SELECT });
        const nombreDestino = new Map<string, string>(destinos.map((d: any) => [d.id_agente, d.nombre]));
        for (const id of porDestino.keys()) {
            const d = destinos.find((x: any) => x.id_agente === id);
            if (!d) throw { status: 404, message: 'Uno de los agentes destino no existe.' };
            if (d.estatus_agente === false) throw { status: 400, message: `El agente destino ${d.nombre ?? ''} está dado de baja.` };
        }

        const resumen: IResumenDestino[] = [];

        await dbLocal.transaction(async (t: Transaction) => {
            // Los clientes deben ser realmente del agente de origen
            const todos = asignaciones.map(a => a.id_cliente_alm);
            const validos = await dbLocal.query<any>(`
                SELECT id_cliente_alm FROM cliente_almacen
                WHERE id_cliente_alm IN (:ids) AND id_agente_cliente_alm = :origen
            `, { replacements: { ids: todos, origen: id_agente_origen }, type: QueryTypes.SELECT, transaction: t });
            if (validos.length !== todos.length) {
                throw { status: 409, message: 'Algunos clientes ya no pertenecen a ese agente. Vuelve a abrir la pantalla e inténtalo de nuevo.' };
            }

            for (const [destino, clientes] of porDestino.entries()) {
                const rep = { origen: id_agente_origen, destino, clientes, abiertos: ESTATUS_PEDIDO_ABIERTO, minimo: SALDO_MINIMO };

                // Pedidos y remisiones con saldo en CxC (se calculan ANTES de mover nada)
                const pedidosDeuda = await dbLocal.query<any>(`
                    SELECT DISTINCT f.id_pedido_alm AS id
                    FROM cuenta_por_cobrar c JOIN facturas f ON f.id_factura = c.id_factura
                    WHERE c.id_cliente_alm IN (:clientes) AND c.saldo_pendiente > :minimo AND f.id_pedido_alm IS NOT NULL
                    UNION
                    SELECT DISTINCT r.id_pedido_alm AS id
                    FROM cuenta_por_cobrar c JOIN remision r ON r.id_remision = c.id_remision
                    WHERE c.id_cliente_alm IN (:clientes) AND c.saldo_pendiente > :minimo AND r.id_pedido_alm IS NOT NULL
                `, { replacements: rep, type: QueryTypes.SELECT, transaction: t });
                const idsPedidosDeuda: string[] = pedidosDeuda.map((p: any) => p.id);

                const remisionesDeuda = await dbLocal.query<any>(`
                    SELECT DISTINCT c.id_remision AS id
                    FROM cuenta_por_cobrar c
                    WHERE c.id_cliente_alm IN (:clientes) AND c.saldo_pendiente > :minimo AND c.id_remision IS NOT NULL
                `, { replacements: rep, type: QueryTypes.SELECT, transaction: t });
                const idsRemisiones: string[] = remisionesDeuda.map((r: any) => r.id);

                // 1. Clientes
                await dbLocal.query(`
                    UPDATE cliente_almacen SET id_agente_cliente_alm = :destino
                    WHERE id_cliente_alm IN (:clientes) AND id_agente_cliente_alm = :origen
                `, { replacements: rep, type: QueryTypes.UPDATE, transaction: t });

                // 2. Pedidos abiertos (sin facturar)
                const abiertos = filasAfectadas(await dbLocal.query(`
                    UPDATE pedido_almacen SET id_agente_pedido_alm = :destino
                    WHERE id_cliente_pedido_alm IN (:clientes) AND id_agente_pedido_alm = :origen
                      AND status_pedido_alm IN (:abiertos) AND fecha_facturado_pedido_alm IS NULL
                `, { replacements: rep, type: QueryTypes.UPDATE, transaction: t }));

                // 3. Pedidos con deuda
                let conDeuda = 0;
                if (idsPedidosDeuda.length) {
                    conDeuda = filasAfectadas(await dbLocal.query(`
                        UPDATE pedido_almacen SET id_agente_pedido_alm = :destino
                        WHERE id_pedido_alm IN (:pedidos) AND id_agente_pedido_alm = :origen
                    `, { replacements: { ...rep, pedidos: idsPedidosDeuda }, type: QueryTypes.UPDATE, transaction: t }));
                }

                // 3b. Remisiones con deuda
                let remis = 0;
                if (idsRemisiones.length) {
                    remis = filasAfectadas(await dbLocal.query(`
                        UPDATE remision SET id_agente = :destino
                        WHERE id_remision IN (:remisiones) AND id_agente = :origen
                    `, { replacements: { ...rep, remisiones: idsRemisiones }, type: QueryTypes.UPDATE, transaction: t }));
                }

                // 4. Devoluciones pendientes de aprobar
                const devs = filasAfectadas(await dbLocal.query(`
                    UPDATE devolucion_cliente SET id_agente = :destino
                    WHERE id_agente = :origen AND estatus = 'PENDIENTE'
                      AND id_factura IN (SELECT id_factura FROM facturas WHERE id_cliente_alm IN (:clientes))
                `, { replacements: rep, type: QueryTypes.UPDATE, transaction: t }));

                resumen.push({
                    id_agente_destino: destino,
                    agente: nombreDestino.get(destino) ?? null,
                    clientes: clientes.length,
                    pedidos_abiertos: abiertos,
                    pedidos_con_deuda: conDeuda,
                    remisiones_con_deuda: remis,
                    devoluciones_pendientes: devs,
                });
            }
        });

        console.log(
            `[Reasignación de cartera] ${usuario} pasó clientes del agente ${id_agente_origen}: ` +
            JSON.stringify({ asignaciones, resumen })
        );

        return { ok: true, resumen };
    },
};
