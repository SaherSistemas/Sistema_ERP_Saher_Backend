import { v4 as uuidv4 } from 'uuid';
import { Op, Sequelize, Transaction } from 'sequelize';
import Pedido_Almacen_Empaque from '../model/Pedido_Almacen_Empaque';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';
import { IActualizarBultosPayload, IFinalizarEmpaquePayload } from '../interface/Pedido_Almacen_Empaque.interface';
import { Pedido_AlmacenRepository } from '../../Pedido/repositories/Pedido_Almacen.repository';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Empleado from '../../../RRHH/model/Empleado';
import { dbLocal } from '../../../../config/db';
import { Bulto_Pedido } from '../model/Bulto_Pedido';
import { Entrega_Pedido } from '../model/Entrega_Pedido';
import { Entrega_Pedido_Detalle } from '../model/Entrega_Pedido_Detalle';
import { guardarFirma } from '../../../../helpers/guardarFirma';



export const Entrega_PedidoRepository = {


    obtenerPedidosPorEntregar: async (id_empresa: string, t?: Transaction) => {

        const resultado = await Pedido_Almacen_Empaque.findAll({
            attributes: [
                [Sequelize.col("pedido.id_agente_pedido_alm"), "id_agente_pedido_alm"],

                [Sequelize.col("pedido->agente.id_agente"), "id_agente"],

                [Sequelize.col("pedido->agente->empleado.nombre_empleado"), "nombre_empleado"],
                [Sequelize.col("pedido->agente->empleado.ap_pat_empleado"), "ap_pat_empleado"],
                [Sequelize.col("pedido->agente->empleado.ap_mat_empleado"), "ap_mat_empleado"],

                [
                    Sequelize.fn(
                        "JSON_AGG",
                        Sequelize.fn(
                            "JSON_BUILD_OBJECT",
                            "cod_int_pedido_alm", Sequelize.col("pedido.cod_int_pedido_alm"),
                            "cajas", Sequelize.col("Pedido_Almacen_Empaque.cajas"),
                            "bolsas", Sequelize.col("Pedido_Almacen_Empaque.bolsas"),
                            // ↓ Agrega los bultos de cada pedido como un array JSON
                            "bultos", Sequelize.literal(`(
                SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id_bulto',   b.id_bulto,
                        'cod_bulto',  b.cod_bulto,
                        'tipo_bulto', b.tipo_bulto,
                        'num_bulto',  b.num_bulto,
                        'total_bulto', b.total_bulto
                    )
                )
                FROM bulto_pedido b
                WHERE b.id_pedido_empaque = "Pedido_Almacen_Empaque"."id_pedido_empaque"
            )`)
                        )
                    ),
                    "pedidos"
                ],
                [
                    Sequelize.fn("SUM", Sequelize.col("Pedido_Almacen_Empaque.cajas")),
                    "total_cajas"
                ],

                [
                    Sequelize.fn("SUM", Sequelize.col("Pedido_Almacen_Empaque.bolsas")),
                    "total_bolsas"
                ]
            ],

            include: [
                {
                    model: Pedido_Almacen,
                    as: "pedido",
                    attributes: [],
                    required: true,
                    include: [
                        {
                            model: Agente_de_Venta,
                            as: "agente",
                            attributes: [],
                            include: [
                                {
                                    model: Empleado,
                                    as: "empleado",
                                    attributes: []
                                }
                            ]
                        }
                    ]
                }
            ],

            where: {
                estado: "EMPACADO"
            },

            group: [
                "pedido.id_agente_pedido_alm",
                "pedido->agente.id_agente",
                "pedido->agente->empleado.id_empleado",
                "pedido->agente->empleado.nombre_empleado",
                "pedido->agente->empleado.ap_pat_empleado",
                "pedido->agente->empleado.ap_mat_empleado"
            ],

            raw: true,
            transaction: t
        });

        return resultado;
    },

    crearSalida: async (dto: {
        tipo_destino: "AGENTE" | "CLIENTE";
        id_agente: string | null;
        id_cliente: string | null;
        bultos_escaneados: string[];
        pedidos: string[];
        tipo_origen: string;
        firma_recibido: string | null;  // ← agregar al dto
    }, t?: Transaction) => {

        const { tipo_origen, tipo_destino, id_agente, id_cliente,
            bultos_escaneados, pedidos, firma_recibido } = dto;

        return await dbLocal.transaction(async (t: Transaction) => {

            // ── 1. Marcar bultos como escaneados ──────────────────────────────
            if (bultos_escaneados.length > 0) {
                await Bulto_Pedido.update(
                    { escaneado: true },
                    { where: { cod_bulto: bultos_escaneados }, transaction: t }
                );
            }

            // ── 2. Obtener pedidos con sus bultos ─────────────────────────────
            const pedidosData = await Pedido_Almacen_Empaque.findAll({
                include: [
                    { model: Pedido_Almacen, where: { cod_int_pedido_alm: pedidos }, as: 'pedido' },
                    { model: Bulto_Pedido, as: 'bultos' },
                ],
                transaction: t,
            });

            const total_pedidos = pedidosData.length;
            const total_cajas = pedidosData.reduce((s, p) => s + (p.cajas ?? 0), 0);
            const total_bolsas = pedidosData.reduce((s, p) => s + (p.bolsas ?? 0), 0);
            const total_bultos = pedidosData.reduce((s, p) => s + (p.bultos?.length ?? 0), 0);

            // ── 3. Crear cabecera Entrega_Pedido ──────────────────────────────
            const salida = await Entrega_Pedido.create({
                tipo_destino,
                tipo_origen,
                id_agente: tipo_destino === "AGENTE" ? id_agente : null,
                id_cliente: tipo_destino === "CLIENTE" ? id_cliente : null,
                fecha_salida: new Date(),
                estado: "ENTREGADA",
                total_pedidos,
                total_cajas,
                total_bolsas,
                total_bultos,
                firma_recibido: null,  // primero null, luego actualizamos
                fecha_firma: null,
            }, { transaction: t });

            // ── 4. Guardar imagen de firma y actualizar registro ──────────────
            if (firma_recibido) {
                const rutaFirma = guardarFirma(firma_recibido, salida.id_entrega_pedido);
                await salida.update(
                    { firma_recibido: rutaFirma, fecha_firma: new Date() },
                    { transaction: t }
                );
            }

            // ── 5. Crear detalle por cada bulto ───────────────────────────────
            const todosBultos = pedidosData.flatMap((p) => p.bultos ?? []);

            await Entrega_Pedido_Detalle.bulkCreate(
                todosBultos.map((bulto) => ({
                    id_entrega_pedido: salida.id_entrega_pedido,
                    id_bulto: bulto.id_bulto,
                    escaneado: bultos_escaneados.includes(bulto.cod_bulto),
                    fecha_escaneo: bultos_escaneados.includes(bulto.cod_bulto) ? new Date() : null,
                })),
                { transaction: t }
            );

            return {
                id_entrega_pedido: salida.id_entrega_pedido,
                total_pedidos,
                total_cajas,
                total_bolsas,
                total_bultos,
                firma_recibido: salida.firma_recibido,
            };
        });
    }
};