import { v4 as uuidv4 } from 'uuid';
import { IFactura_Compra_Proveedor, ICreateFacturaCompraProveedor } from '../interface/Factura_Compra_Proveedor.interfece';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import { Compra_ProveedorRepository } from '../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import { Model, Op, Sequelize, Transaction } from 'sequelize';
import { EmpleadoRepository } from '../../../RRHH/repositories/Empleado.repository';
import { Detalle_Factura_Compra_ProveedorRepository } from './Detalle_Factura_Compra_Proveedor.repository';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';
import Lote_Factura_Compra_Proveedor from '../model/Lote_Factura_Compra_Proveedor';
import { fn, col } from "sequelize";
import { UsuarioRepository } from '../../../Seguridad/repositories/Usuario.repository';
import Compra_General from '../../../Compras/Ordenes-Compra/model/Compra_General';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';
import Empleado from '../../../RRHH/model/Empleado';
export const Factura_Compra_ProveedorRepository = {
    getAllConFiltroDeEstado: async () => {
        return await Factura_Compra_Proveedor.findAll({
            where: { estado_factura_proveedor: ["C", "R"] },

            // agrega el conteo como campo calculado
            attributes: {
                include: [
                    [fn("COUNT", col("detalles_factura_compra_proveedor.id_factura_proveedor_detalle")), "renglones"],
                    [fn("SUM", col("detalles_factura_compra_proveedor.cantidad_articulo_facturada")), "total_articulos"]
                ],
            },

            include: [
                {
                    model: Detalle_Factura_Compra_Proveedor,
                    as: 'detalles_factura_compra_proveedor',
                    attributes: [],     // importante para evitar duplicados
                    required: false,    // factura aunque no tenga detalles
                },
                {
                    model: Compra_Proveedor,
                    attributes: ["id_comp", "idprove_comp"],
                    include: [
                        {
                            model: Proveedor,
                            attributes: ["id_prove", "nomcort_prove"],
                        },
                    ],
                },
            ],

            // agrupa por las PKs incluidas
            group: [
                "Factura_Compra_Proveedor.id_factura_proveedor",
                "compra.id_comp",
                "compra->proveedor.id_prove",
            ],
        });
    },
    getByID: async (id_comp: string, t?: Transaction) => {
        return await Factura_Compra_Proveedor.findOne({
            where: {
                id_compra_prove_factura: id_comp
            },
            transaction: t
        });
    },

    getFacturaConDetalles: async (id_factura_compra_proveedor: string) => {
        const facturaInst = await Factura_Compra_Proveedor.findByPk(id_factura_compra_proveedor, {
            attributes: ['id_factura_proveedor', 'folio_factura_proveedor', 'estado_factura_proveedor'],
            include: [
                {
                    model: Compra_Proveedor,
                    as: 'compra',
                    attributes: ['id_comp', 'idprove_comp'],
                    include: [
                        {
                            model: Proveedor,
                            as: 'proveedor',
                            attributes: ['id_prove', 'nomcort_prove'],
                        },
                    ],
                },
            ],
        });

        const factura = facturaInst ? facturaInst.toJSON() : null;

        const detallesInst =
            await Detalle_Factura_Compra_ProveedorRepository.getDetallesPorIdFacturaProveedor(
                id_factura_compra_proveedor
            );

        // ✅ convertir todo a plain (evita ciclos)
        const detallesRaw = (detallesInst || []).map((d: any) =>
            typeof d?.toJSON === 'function' ? d.toJSON() : d
        );

        const detalles = detallesRaw.map((d: any) => {
            const detallesRec = Array.isArray(d.detallesRecibidos) ? d.detallesRecibidos : [];
            const tieneRecibidos = detallesRec.length > 0;

            const lotesDeRecibido = detallesRec.flatMap((dr: any) =>
                Array.isArray(dr.lotesRecibidos) ? dr.lotesRecibidos : []
            );

            const lotesDeFactura = Array.isArray(d.lotes_factura_compra) ? d.lotes_factura_compra : [];

            return {
                ...d,
                lotes_finales: tieneRecibidos ? lotesDeRecibido : lotesDeFactura,
            };
        });

        // console.log("DETALLES (plain):", JSON.stringify(detalles, null, 2));

        return { factura, detalles };
    },

    getFacturaConDetallesParaGuardar: async (id_factura_compra_proveedor: string, t?: Transaction) => {
        const facturaInst = await Factura_Compra_Proveedor.findByPk(id_factura_compra_proveedor, {
            attributes: ['id_factura_proveedor', 'folio_factura_proveedor', 'estado_factura_proveedor'],
            include: [
                {
                    model: Compra_Proveedor,
                    as: 'compra',
                    attributes: ['id_comp', 'idprove_comp'],
                    include: [{
                        model: Compra_General,
                        attributes: ['id_compra_general', 'id_empresa_sucursal']
                    }]
                },
            ],
            transaction: t
        });

        const factura = facturaInst ? facturaInst.toJSON() : null;

        const detallesInst =
            await Detalle_Factura_Compra_ProveedorRepository.getDetallesPorIdFacturaProveedor(
                id_factura_compra_proveedor
            );

        // ✅ convertir todo a plain (evita ciclos)
        const detallesRaw = (detallesInst || []).map((d: any) =>
            typeof d?.toJSON === 'function' ? d.toJSON() : d
        );

        const detalles = detallesRaw.map((d: any) => {
            const detallesRec = Array.isArray(d.detallesRecibidos) ? d.detallesRecibidos : [];
            const tieneRecibidos = detallesRec.length > 0;

            const lotesDeRecibido = detallesRec.flatMap((dr: any) =>
                Array.isArray(dr.lotesRecibidos) ? dr.lotesRecibidos : []
            );

            const lotesDeFactura = Array.isArray(d.lotes_factura_compra) ? d.lotes_factura_compra : [];

            return {
                ...d,
                lotes_finales: tieneRecibidos ? lotesDeRecibido : lotesDeFactura,
            };
        });

        // console.log("DETALLES (plain):", JSON.stringify(detalles, null, 2));

        return { factura, detalles };
    },





    actualizarTotalesFactura: async (id_factura_compra_proveedor: string, totalSinIva: number, totaliva: number, id_empleado_registro_lotes: number, t?: Transaction) => {
        //AQUI SOLO SE HACE UPDATE DE LOS TOTALES DE LA FACTURA

        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado_registro_lotes);
        if (!empleado) throw new Error('Empleado no encontrado');
        return await Factura_Compra_Proveedor.update({
            total_factura_proveedor: totalSinIva,
            total_iva_factura: totaliva,
            fin_de_registro_lotes: new Date(),
            id_empleado_registro_lotes: empleado.id_empleado,
            estado_factura_proveedor: 'C'
        }, { where: { id_factura_proveedor: id_factura_compra_proveedor }, transaction: t })
    },
    guardarFacturaEIniciarCapturaLotes: async (data: ICreateFacturaCompraProveedor) => {
        //console.log(data)
        const compraProveedor = await Compra_ProveedorRepository.getByID(data.id_compra_prove_factura);

        if (!compraProveedor) throw new Error('Compra proveedor no encontrada');

        const updates: any = {};

        // Acumular costo por envío
        updates.costo_por_envio = Number(compraProveedor.costo_por_envio || 0) + Number(data.costo_por_envio || 0);

        // Solo colocar fecha si aún no existe
        if (!compraProveedor.inicio_de_registro_lotes) {
            updates.inicio_de_registro_lotes = new Date();
        }

        // No actualizar estado_comp si ya tiene uno definido
        // (Si quieres permitir que se cambie solo si estaba en otro estado, aquí se ajusta)
        // updates.estado_comp = compraProveedor.estado_comp; // NO se toca

        await compraProveedor.update(updates);

        return await Factura_Compra_Proveedor.create({
            id_factura_proveedor: uuidv4(),
            id_compra_prove_factura: data.id_compra_prove_factura,
            folio_factura_proveedor: data.folio_factura_proveedor,
            fecha_emision: data.fecha_emision,
            fecha_vencimiento: data.fecha_vencimiento,
            total_factura_proveedor: data.total_factura_proveedor,
            estatus_pago_factura: 'PENDIENTE',
            estado_factura_proveedor: 'E',
            url_PDF: '',
            url_XML: '',
            inicio_de_registro_lotes: new Date()
        });
    },
    getFacturasPendientes: async () => {
        return await Factura_Compra_Proveedor.findAll({
            where: { estado_factura_proveedor: 'D' },
            attributes: [
                'id_factura_proveedor',
                'folio_factura_proveedor',
                'estado_factura_proveedor',
                'total_factura_proveedor',
                'total_iva_factura',
                'total_recibido_factura',
                'total_iva_recibido_factura',
            ],
            include: [
                {
                    model: Compra_Proveedor,
                    as: 'compra',
                    attributes: ['id_comp'],
                    include: [
                        {
                            model: Proveedor,
                            attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'],
                        }
                    ]
                }
            ]
        });
    },

    getFacturaEnCaptura: async (id_comp: string) => {
        return await Factura_Compra_Proveedor.findOne({
            where: {
                id_compra_prove_factura: id_comp,
                estado_factura_proveedor: 'E'
            }
        });
    },



    recibirFacturaCompraProveedor: async (id_factura_compra_proveedor: string, t: Transaction, usuario_empleado_chequeo: string) => {
        const id_empleado_chequeo = await UsuarioRepository.usuarioPorUser(usuario_empleado_chequeo);
        const facturaCompleta = await Factura_Compra_Proveedor.findByPk(id_factura_compra_proveedor);
        if (!facturaCompleta.inicio_de_checado) {
            const [affectedRows, [factura]] = await Factura_Compra_Proveedor.update(
                {
                    estado_factura_proveedor: 'R',
                    inicio_de_checado: Sequelize.literal(
                        `COALESCE(inicio_de_checado, NOW())`
                    ),
                    id_empleado_checado: id_empleado_chequeo.id_referencia_persona
                },
                {
                    where: { id_factura_proveedor: id_factura_compra_proveedor },
                    returning: true,
                }
            );
            return factura;
        }
        return true;
    },
    finalizarChequeoFacturaProveedor: async (
        id_factura_proveedor: string,
        id_empleado_checado: string,
        t?: Transaction,
        totales?: { recibido: number; iva_recibido: number; estado_factura?: string }
    ) => {
        const updateFields: any = {
            estado_factura_proveedor: totales?.estado_factura ?? 'H',
            fin_de_checado: new Date(),
            id_empleado_checado,
        };
        if (totales) {
            updateFields.total_recibido_factura = totales.recibido;
            updateFields.total_iva_recibido_factura = totales.iva_recibido;
        }
        const [, [factura]] = await Factura_Compra_Proveedor.update(
            updateFields,
            {
                where: { id_factura_proveedor },
                returning: ['id_factura_proveedor', 'estado_factura_proveedor', 'fin_de_checado', 'id_empleado_checado', 'id_compra_prove_factura'],
                transaction: t
            }
        );
        return factura.dataValues;
    },

    updateEstadoFactura: async (
        id_factura_proveedor: string,
        estado: string,
        options?: { transaction?: Transaction }
    ) => {
        return await Factura_Compra_Proveedor.update(
            { estado_factura_proveedor: estado },
            { where: { id_factura_proveedor }, transaction: options?.transaction }
        );
    },

    updateEstadoByCompraProveedor: async (
        id_compra_prove_factura: string,
        estado_nuevo: string,
        options?: { transaction?: Transaction }
    ) => {
        return await Factura_Compra_Proveedor.update(
            { estado_factura_proveedor: estado_nuevo },
            { where: { id_compra_prove_factura, estado_factura_proveedor: 'D' }, transaction: options?.transaction }
        );
    },

    hayFacturasEnDevolucion: async (
        id_compra_prove_factura: string,
        options?: { transaction?: Transaction }
    ) => {
        const count = await Factura_Compra_Proveedor.count({
            where: { id_compra_prove_factura, estado_factura_proveedor: 'D' },
            transaction: options?.transaction,
        });
        return count > 0;
    },

    actualizarEmpleadoYEstado: async (id_factura_compra_proveedor: string, id_empleado: string, t?: Transaction) => {
        return await Factura_Compra_Proveedor.update(
            { estado_factura_proveedor: 'C', fin_de_registro_lotes: new Date(), id_empleado_registro_lotes: id_empleado },
            { where: { id_factura_proveedor: id_factura_compra_proveedor }, transaction: t }
        );
    },

    getFacturaCompleta: async (id_factura_proveedor: string) => {
        const facturaInst = await Factura_Compra_Proveedor.findByPk(id_factura_proveedor, {
            include: [
                {
                    model: Compra_Proveedor,
                    as: 'compra',
                    attributes: ['id_comp', 'idprove_comp'],
                    include: [
                        {
                            model: Proveedor,
                            attributes: ['id_prove', 'nomcort_prove', 'razsoc_prove', 'rfc_prove'],
                        },
                    ],
                },
                {
                    model: Empleado,
                    as: 'empleado_registro_lotes',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'],
                    required: false,
                },
                {
                    model: Empleado,
                    as: 'empleado_checado',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'],
                    required: false,
                },
                {
                    model: Empleado,
                    as: 'empleado_acomodo',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado', 'ap_mat_empleado'],
                    required: false,
                },
            ],
        });

        if (!facturaInst) return null;
        const factura = facturaInst.toJSON();

        // Detalles ya con artículo, lotes facturados y recibidos
        const detallesInst = await Detalle_Factura_Compra_ProveedorRepository.getDetallesPorIdFacturaProveedor(id_factura_proveedor);
        const detalles = (detallesInst || []).map((d: any) => {
            const plain = typeof d?.toJSON === 'function' ? d.toJSON() : d;

            // Artículo: normal (vía solicitado) o extra (directo)
            const articulo = plain.detalleCompraSolicitado?.articulo ?? plain.articulo ?? null;

            // Cantidad recibida = suma de detallesRecibidos
            const detallesRec: any[] = Array.isArray(plain.detallesRecibidos) ? plain.detallesRecibidos : [];
            const cantidad_recibida = detallesRec.reduce((s: number, r: any) => s + Number(r.cantidad_detcomprec ?? 0), 0);
            const cantidad_facturada = Number(plain.cantidad_articulo_facturada ?? 0);
            const diferencia = cantidad_facturada - cantidad_recibida;

            const precio     = Number(plain.precio_articulo_factura ?? 0);
            const descPct    = Number(plain.descuento_articulo_factura ?? 0);
            const ivaPct     = Number(plain.iva_articulo_factura ?? 0);
            const precioNeto = precio * (1 - descPct / 100);

            return {
                id_factura_proveedor_detalle: plain.id_factura_proveedor_detalle,
                articulo,
                cantidad_facturada,
                cantidad_recibida,
                diferencia,
                precio,
                descuento: descPct,
                iva: ivaPct,
                subtotal_factura:  precioNeto * cantidad_facturada,
                subtotal_recibido: precioNeto * cantidad_recibida,
                checado:           plain.checado,
                fecha_checado:     plain.fecha_checado,
                lotes_facturados:  plain.lotes_factura_compra ?? [],
                lotes_recibidos:   detallesRec.flatMap((r: any) => r.lotesRecibidos ?? []),
            };
        });

        return { factura, detalles };
    },

    getFacturasPorCompraProveedor: async (id_comp: string) => {
        return await Factura_Compra_Proveedor.findAll({
            where: { id_compra_prove_factura: id_comp },
            attributes: [
                'id_factura_proveedor',
                'folio_factura_proveedor',
                'estado_factura_proveedor',
                'estatus_pago_factura',
                'total_factura_proveedor',
                'total_iva_factura',
                'total_recibido_factura',
                'total_iva_recibido_factura',
                'fecha_emision',
                'fecha_vencimiento',
                'inicio_de_registro_lotes',
                'fin_de_registro_lotes',
                'inicio_de_checado',
                'fin_de_checado',
                'createdAt',
            ],
            order: [['createdAt', 'ASC']],
        });
    },

    recalcularTotales: async (id_factura_compra_proveedor: string, t?: Transaction) => {
        const detalles = await Detalle_Factura_Compra_Proveedor.findAll({
            where: { id_factura_compra_proveedor },
            attributes: ['cantidad_articulo_facturada', 'precio_articulo_factura', 'descuento_articulo_factura', 'iva_articulo_factura'],
            transaction: t,
        });

        let totalSinIva = 0;
        let totalIva = 0;
        for (const d of detalles) {
            const cantidad = Number(d.cantidad_articulo_facturada ?? 0);
            const precio = Number(d.precio_articulo_factura ?? 0);
            const descPct = Number(d.descuento_articulo_factura ?? 0);
            const ivaPct = Number(d.iva_articulo_factura ?? 0);
            const neto = precio * cantidad * (1 - descPct / 100);
            totalSinIva += neto;
            totalIva += neto * (ivaPct / 100);
        }

        return await Factura_Compra_Proveedor.update(
            { total_factura_proveedor: totalSinIva, total_iva_factura: totalIva },
            { where: { id_factura_proveedor: id_factura_compra_proveedor }, transaction: t }
        );
    },

}