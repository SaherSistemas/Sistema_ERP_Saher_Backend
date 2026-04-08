import { v4 as uuidv4 } from 'uuid';
import { Op, Sequelize, Transaction } from 'sequelize';
import Pedido_Almacen_Empaque from '../model/Pedido_Almacen_Empaque';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Empleado from '../../../RRHH/model/Empleado';
import { dbLocal } from '../../../../config/db';
import { Bulto_Pedido } from '../model/Bulto_Pedido';
import { Entrega_Pedido } from '../model/Entrega_Pedido';
import { Entrega_Pedido_Detalle } from '../model/Entrega_Pedido_Detalle';
import { guardarFirma } from '../../../../helpers/guardarFirma';
import { AgenteRepository } from '../../../Comercial/Agente_Venta/repositories/Agente.repository';


export const Entrega_PedidoRepository = {

    /**
     * Devuelve los pedidos en estado EMPACADO listos para salir.
     * Agrupa por agente (flujo ALMACEN → AGENTE → CLIENTE).
     * Los pedidos sin agente se devuelven en el array `sin_agente`
     * para el flujo directo ALMACEN → CLIENTE.
     */
    obtenerPedidosPorEntregar: async (id_empresa: string, t?: Transaction) => {

        // ── Flujo AGENTE: pedidos con agente asignado ─────────────────────
        const porAgente = await Pedido_Almacen_Empaque.findAll({
            attributes: [
                [Sequelize.col('pedido.id_agente_pedido_alm'), 'id_agente_pedido_alm'],
                [Sequelize.col('pedido->agente.id_agente'), 'id_agente'],
                [Sequelize.col('pedido->agente->empleado.nombre_empleado'), 'nombre_empleado'],
                [Sequelize.col('pedido->agente->empleado.ap_pat_empleado'), 'ap_pat_empleado'],
                [Sequelize.col('pedido->agente->empleado.ap_mat_empleado'), 'ap_mat_empleado'],
                [
                    Sequelize.fn('JSON_AGG', Sequelize.fn('JSON_BUILD_OBJECT',
                        'cod_int_pedido_alm', Sequelize.col('pedido.cod_int_pedido_alm'),
                        'cajas', Sequelize.col('Pedido_Almacen_Empaque.cajas'),
                        'bolsas', Sequelize.col('Pedido_Almacen_Empaque.bolsas'),
                        'bultos', Sequelize.literal(`(
                            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                'id_bulto',    b.id_bulto,
                                'cod_bulto',   b.cod_bulto,
                                'tipo_bulto',  b.tipo_bulto,
                                'num_bulto',   b.num_bulto,
                                'total_bulto', b.total_bulto
                            ))
                            FROM bulto_pedido b
                            WHERE b.id_pedido_empaque = "Pedido_Almacen_Empaque"."id_pedido_empaque"
                        )`)
                    )),
                    'pedidos'
                ],
                [Sequelize.fn('SUM', Sequelize.col('Pedido_Almacen_Empaque.cajas')), 'total_cajas'],
                [Sequelize.fn('SUM', Sequelize.col('Pedido_Almacen_Empaque.bolsas')), 'total_bolsas'],
            ],
            include: [
                {
                    model: Pedido_Almacen,
                    as: 'pedido',
                    attributes: [],
                    required: true,
                    where: { id_agente_pedido_alm: { [Op.ne]: null } },  // solo con agente
                    include: [{
                        model: Agente_de_Venta,
                        as: 'agente',
                        attributes: [],
                        required: true,
                        include: [{ model: Empleado, as: 'empleado', attributes: [] }]
                    }]
                }
            ],
            where: { estado: 'EMPACADO' },
            group: [
                'pedido.id_agente_pedido_alm',
                'pedido->agente.id_agente',
                'pedido->agente->empleado.id_empleado',
                'pedido->agente->empleado.nombre_empleado',
                'pedido->agente->empleado.ap_pat_empleado',
                'pedido->agente->empleado.ap_mat_empleado',
            ],
            raw: true,
            transaction: t,
        });

        // ── Flujo CLIENTE directo: pedidos sin agente ─────────────────────
        const sinAgente = await Pedido_Almacen_Empaque.findAll({
            attributes: [
                [Sequelize.col('pedido.id_pedido_alm'), 'id_pedido_alm'],
                [Sequelize.col('pedido.cod_int_pedido_alm'), 'cod_int_pedido_alm'],
                [Sequelize.col('pedido.id_cliente_pedido_alm'), 'id_cliente_pedido_alm'],
                'cajas', 'bolsas',
                [
                    Sequelize.literal(`(
                        SELECT JSON_AGG(JSON_BUILD_OBJECT(
                            'id_bulto',    b.id_bulto,
                            'cod_bulto',   b.cod_bulto,
                            'tipo_bulto',  b.tipo_bulto,
                            'num_bulto',   b.num_bulto,
                            'total_bulto', b.total_bulto
                        ))
                        FROM bulto_pedido b
                        WHERE b.id_pedido_empaque = "Pedido_Almacen_Empaque"."id_pedido_empaque"
                    )`),
                    'bultos'
                ],
            ],
            include: [{
                model: Pedido_Almacen,
                as: 'pedido',
                attributes: [],
                required: true,
                where: { id_agente_pedido_alm: null },   // solo sin agente
            }],
            where: { estado: 'EMPACADO' },
            raw: true,
            transaction: t,
        });

        return { por_agente: porAgente, sin_agente: sinAgente };
    },

    /**
     * Devuelve pedidos listos para entregar al cliente según el tipo de usuario:
     *  - ALMACEN : pedidos EMPACADO sin agente (entrega directa al cliente).
     *  - AGENTE  : entregas ABIERTA que el agente ya recibió de almacén y aún
     *              no ha entregado al cliente.
     */
    obtenerPedidosParaEntregaCliente: async (params: {
        tipo: 'ALMACEN' | 'AGENTE';
        id_empresa?: string;
        id_persona?: string;
    }) => {
        const { tipo, id_persona } = params;
        const agente = await AgenteRepository.getByIdEmpleado(id_persona);
        const id_agente = agente?.id_agente;
        // console.log('Entrega_PedidoRepository.obtenerPedidosParaEntregaCliente - id_persona:', id_persona, 'id_agente:', id_agente);
        // console.log('obtenerPedidosParaEntregaCliente - params:', params);
        if (tipo === 'ALMACEN') {
            return await Pedido_Almacen_Empaque.findAll({
                attributes: [
                    [Sequelize.col('pedido.id_pedido_alm'), 'id_pedido_alm'],
                    [Sequelize.col('pedido.cod_int_pedido_alm'), 'cod_int_pedido_alm'],
                    [Sequelize.col('pedido.id_cliente_pedido_alm'), 'id_cliente_pedido_alm'],
                    'cajas',
                    'bolsas',
                    [
                        Sequelize.literal(`(
                            SELECT ca.nom_corto_cliente_alm
                            FROM cliente_almacen ca
                            WHERE ca.id_cliente_alm = "pedido"."id_cliente_pedido_alm"
                        )`),
                        'nom_corto_cliente',
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT ca.razon_social_cliente_alm
                            FROM cliente_almacen ca
                            WHERE ca.id_cliente_alm = "pedido"."id_cliente_pedido_alm"
                        )`),
                        'razon_social_cliente',
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                                'id_bulto',    b.id_bulto,
                                'cod_bulto',   b.cod_bulto,
                                'tipo_bulto',  b.tipo_bulto,
                                'num_bulto',   b.num_bulto,
                                'total_bulto', b.total_bulto
                            ))
                            FROM bulto_pedido b
                            WHERE b.id_pedido_empaque = "Pedido_Almacen_Empaque"."id_pedido_empaque"
                        )`),
                        'bultos',
                    ],
                ],
                include: [{
                    model: Pedido_Almacen,
                    as: 'pedido',
                    attributes: [],
                    required: true,
                }],
                where: { estado: 'EMPACADO' },
                raw: true,
            });
        }

        // AGENTE: entregas ABIERTA que el agente ya firmó de recibido
        return await Entrega_Pedido.findAll({
            where: {
                tipo_destino: 'AGENTE',
                estado: 'ABIERTA',
                id_agente,
            },
            attributes: [
                'id_entrega_pedido',
                'fecha_salida',
                'total_pedidos',
                'total_cajas',
                'total_bolsas',
                'total_bultos',
                [
                    Sequelize.literal(`(
                        SELECT JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
                            'cod_int_pedido_alm',    pa.cod_int_pedido_alm,
                            'id_cliente_pedido_alm', pa.id_cliente_pedido_alm,
                            'nom_corto_cliente',     ca.nom_corto_cliente_alm,
                            'razon_social_cliente',  ca.razon_social_cliente_alm
                        ))
                        FROM entrega_pedido_detalle epd
                        JOIN bulto_pedido           bp  ON bp.id_bulto            = epd.id_bulto
                        JOIN pedido_almacen_empaque pae ON pae.id_pedido_empaque  = bp.id_pedido_empaque
                        JOIN pedido_almacen         pa  ON pa.id_pedido_alm       = pae.id_pedido_almacen
                        JOIN cliente_almacen        ca  ON ca.id_cliente_alm      = pa.id_cliente_pedido_alm
                        WHERE epd.id_entrega_pedido = "Entrega_Pedido"."id_entrega_pedido"
                    )`),
                    'pedidos',
                ],
                [
                    Sequelize.literal(`(
                        SELECT JSON_AGG(JSON_BUILD_OBJECT(
                            'id_bulto',    bp.id_bulto,
                            'cod_bulto',   bp.cod_bulto,
                            'tipo_bulto',  bp.tipo_bulto,
                            'num_bulto',   bp.num_bulto,
                            'total_bulto', bp.total_bulto
                        ))
                        FROM entrega_pedido_detalle epd
                        JOIN bulto_pedido           bp ON bp.id_bulto = epd.id_bulto
                        WHERE epd.id_entrega_pedido = "Entrega_Pedido"."id_entrega_pedido"
                    )`),
                    'bultos',
                ],
            ],
            raw: true,
        });
    },

    /**
     * Crea la salida de mercancía desde almacén.
     *
     * FLUJO 1 – ALMACEN → CLIENTE (directo):
     *   - El cliente está presente, firma en el momento.
     *   - entrega.estado = 'ENTREGADA' inmediatamente.
     *
     * FLUJO 2 – ALMACEN → AGENTE (para que el agente lleve al cliente):
     *   - El agente firma de recibido ante almacén.
     *   - entrega.estado = 'ABIERTA'  ← pendiente de firma del cliente.
     *   - Cuando el agente obtiene la firma del cliente
     *     se llama a POST /firma con tipo_firma='RECIBE'
     *     y eso cierra la entrega → estado = 'ENTREGADA'.
     */
    crearSalida: async (dto: {
        tipo_destino: 'AGENTE' | 'CLIENTE';
        id_agente: string | null;
        id_cliente: string | null;
        bultos_escaneados: string[];   // cod_bulto[]
        pedidos: string[];             // cod_int_pedido_alm[]
        tipo_origen: string;
        firma_recibido: string | null; // base64 — firma del AGENTE o del CLIENTE directo
    }, externalTx?: Transaction) => {

        const execute = async (t: Transaction) => {
            const { tipo_origen, tipo_destino, id_agente, id_cliente,
                bultos_escaneados, pedidos, firma_recibido } = dto;

            // 1. Marcar bultos como escaneados ─────────────────────────────
            if (bultos_escaneados.length > 0) {
                await Bulto_Pedido.update(
                    { escaneado: true },
                    { where: { cod_bulto: { [Op.in]: bultos_escaneados } }, transaction: t }
                );
            }

            // 2. Obtener pedidos con sus bultos ────────────────────────────
            const pedidosData = await Pedido_Almacen_Empaque.findAll({
                include: [
                    {
                        model: Pedido_Almacen, as: 'pedido',
                        where: { cod_int_pedido_alm: { [Op.in]: pedidos } }
                    },
                    { model: Bulto_Pedido, as: 'bultos' },
                ],
                transaction: t,
            });

            const total_pedidos = pedidosData.length;
            const total_cajas = pedidosData.reduce((s, p) => s + (p.cajas ?? 0), 0);
            const total_bolsas = pedidosData.reduce((s, p) => s + (p.bolsas ?? 0), 0);
            const total_bultos = pedidosData.reduce((s, p) => s + (p.bultos?.length ?? 0), 0);

            // 3. Determinar estado según flujo ─────────────────────────────
            //    AGENTE: queda ABIERTA hasta que el cliente firme con el agente
            //    CLIENTE directo: ya firma aquí → ENTREGADA
            const estadoInicial: 'ABIERTA' | 'ENTREGADA' =
                tipo_destino === 'AGENTE' ? 'ABIERTA' : 'ENTREGADA';

            // 4. Crear cabecera ─────────────────────────────────────────────
            const salida = await Entrega_Pedido.create({
                tipo_destino,
                tipo_origen,
                id_agente: tipo_destino === 'AGENTE' ? id_agente : null,
                id_cliente: tipo_destino === 'CLIENTE' ? id_cliente : null,
                fecha_salida: new Date(),
                estado: estadoInicial,
                total_pedidos,
                total_cajas,
                total_bolsas,
                total_bultos,
                firma_recibido: null,
                fecha_firma: null,
            }, { transaction: t });

            // 5. Guardar firma (agente o cliente directo) ───────────────────
            if (firma_recibido) {
                const rutaFirma = guardarFirma(firma_recibido, salida.id_entrega_pedido);
                await salida.update(
                    { firma_recibido: rutaFirma, fecha_firma: new Date() },
                    { transaction: t }
                );
            }

            // 6. Crear detalle por bulto ────────────────────────────────────
            const todosBultos = pedidosData.flatMap(p => p.bultos ?? []);
            if (todosBultos.length > 0) {
                await Entrega_Pedido_Detalle.bulkCreate(
                    todosBultos.map(bulto => ({
                        id_entrega_pedido: salida.id_entrega_pedido,
                        id_bulto: bulto.id_bulto,
                        escaneado: bultos_escaneados.includes(bulto.cod_bulto),
                        fecha_escaneo: bultos_escaneados.includes(bulto.cod_bulto) ? new Date() : null,
                    })),
                    { transaction: t }
                );
            }

            // 7. Marcar empaques como FINALIZADO ───────────────────────────
            const idsEmpaque = pedidosData.map(p => p.id_pedido_empaque);
            if (idsEmpaque.length > 0) {
                await Pedido_Almacen_Empaque.update(
                    { estado: 'FINALIZADO', fin: new Date() },
                    { where: { id_pedido_empaque: { [Op.in]: idsEmpaque } }, transaction: t }
                );
            }

            // 8. Si el AGENTE está entregando al CLIENTE, cerrar la entrega
            //    ALMACEN → AGENTE que sigue ABIERTA con esos mismos bultos ───
            if (tipo_origen === 'AGENTE' && todosBultos.length > 0) {
                const idsBultos = todosBultos.map(b => b.id_bulto);

                const detallesAbiertos = await Entrega_Pedido_Detalle.findAll({
                    where: { id_bulto: { [Op.in]: idsBultos } },
                    include: [{
                        model: Entrega_Pedido,
                        as: 'entrega',
                        where: { estado: 'ABIERTA', tipo_destino: 'AGENTE' },
                        required: true,
                    }],
                    transaction: t,
                });

                const idsEntregasAbiertas = [
                    ...new Set(detallesAbiertos.map(d => d.id_entrega_pedido))
                ];

                if (idsEntregasAbiertas.length > 0) {
                    await Entrega_Pedido.update(
                        { estado: 'ENTREGADA', fecha_firma: new Date() },
                        { where: { id_entrega_pedido: { [Op.in]: idsEntregasAbiertas } }, transaction: t }
                    );
                }
            }

            return {
                id_entrega_pedido: salida.id_entrega_pedido,
                estado: estadoInicial,
                tipo_destino,
                total_pedidos,
                total_cajas,
                total_bolsas,
                total_bultos,
                firma_recibido: salida.firma_recibido,
            };
        };

        // Si ya viene de una transacción externa la usamos; si no, creamos una nueva
        return externalTx ? execute(externalTx) : dbLocal.transaction(execute);
    },
};
