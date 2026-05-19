import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Pago_CxC from '../model/Pago_CxC.model';
import Cuenta_Por_Cobrar from '../model/Cuenta_Por_Cobrar.model';
import Cat_Metodo_Pago from '../../../Catalogos/model/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Facturas from '../../../Facturas/model/Facturas.model';
import Remision from '../../Remisiones/model/Remision.model';
import { ICapturarPago } from '../interface/CxC.interface';
import FacturaPagoCFDI from '../../../Facturas/model/Factura_Pago_CFDI.model';

export const Pago_CxCRepository = {

    // Paso 1 — Solo guarda el pago como CAP, sin tocar la CxC
    capturar: async (data: ICapturarPago, t: Transaction) => {
        return await Pago_CxC.create({
            id_pago_cxc: uuidv4(),
            id_cxc: data.id_cxc,
            numero_recibo: data.numero_recibo,
            id_metodo_pago: data.id_metodo_pago,
            id_forma_pago: data.id_forma_pago,
            monto_pago: data.monto_pago,
            fecha_pago: data.fecha_pago,
            referencia_pago: data.referencia_pago ?? null,
            id_empleado_captura: data.id_empleado_captura,
            id_empleado_aplica: null,
            fecha_aplicado: null,
            notas: data.notas ?? null,
            estatus_pago: 'CAP',
        }, { transaction: t });
    },

    // Paso 2 — Marca el pago como APL y registra quién lo aplicó y cuándo
    marcarAplicado: async (id_pago_cxc: string, id_empleado_aplica: string, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(
            {
                estatus_pago: 'APL',
                id_empleado_aplica,
                fecha_aplicado: new Date(),
            },
            {
                where: { id_pago_cxc },
                returning: true,
                transaction: t,
            }
        );
        return pago;
    },

    // Pagos capturados pendientes de aplicar — incluye CxC con cliente y factura/remisión
    getPendientesDeAplicar: async () => {
        return await Pago_CxC.findAll({
            where: { estatus_pago: 'CAP' },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc', 'fecha_vencimiento'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat', 'total_factura'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision', 'total_remision'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // Pagos registrados por un empleado específico (web: vista del agente)
    getMisRecibos: async (id_empleado_captura: string) => {
        return await Pago_CxC.findAll({
            where: { id_empleado_captura },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'DESC']],
        });
    },

    // Todos los pagos de una CxC
    getByIdCxC: async (id_cxc: string) => {
        return await Pago_CxC.findAll({
            where: { id_cxc },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                { model: Empleado, foreignKey: 'id_empleado_captura', as: 'empleado_captura', attributes: ['id_empleado', 'nombre_empleado'] },
                { model: Empleado, foreignKey: 'id_empleado_aplica', as: 'empleado_aplica', attributes: ['id_empleado', 'nombre_empleado'] },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    getById: async (id_pago_cxc: string) => {
        return await Pago_CxC.findByPk(id_pago_cxc);
    },

    // Edita campos de un pago CAP (antes de ser aplicado)
    editar: async (id_pago_cxc: string, campos: {
        monto_pago?: number;
        fecha_pago?: Date | string;
        id_forma_pago?: string;
        id_metodo_pago?: string;
        referencia_pago?: string | null;
        notas?: string | null;
        numero_recibo?: string;
    }, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(campos, {
            where: { id_pago_cxc },
            returning: true,
            transaction: t,
        });
        return pago;
    },

    // Cancela un pago que aún no fue aplicado (estatus CAP)
    cancelar: async (id_pago_cxc: string, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(
            { estatus_pago: 'CAN' },
            { where: { id_pago_cxc }, returning: true, transaction: t }
        );
        return pago;
    },

    // Pagos APL que no tienen FacturaPagoCFDI asociado (necesitan timbrado manual)
    getPagosAplicadosSinCFDI: async () => {
        const { Op } = await import('sequelize');

        // IDs de pagos que ya tienen CFDI generado
        const conCFDI = await FacturaPagoCFDI.findAll({
            attributes: ['id_pago_cxc'],
            where: { id_pago_cxc: { [Op.ne]: null } },
        });
        const idsConCFDI = conCFDI.map((c: any) => c.id_pago_cxc).filter(Boolean);

        return await Pago_CxC.findAll({
            where: {
                estatus_pago: 'APL',
                ...(idsConCFDI.length > 0 ? { id_pago_cxc: { [Op.notIn]: idsConCFDI } } : {}),
            },
            include: [
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Cuenta_Por_Cobrar,
                    attributes: ['id_cxc', 'monto_total', 'saldo_pendiente', 'estatus_cxc'],
                    include: [
                        {
                            model: Cliente_Almacen,
                            attributes: ['id_cliente_alm', 'razon_social_cliente_alm', 'nom_corto_cliente_alm', 'rfc_cliente_alm'],
                        },
                        {
                            model: Facturas,
                            attributes: ['id_factura', 'folio_factura', 'uuid_sat', 'total_factura'],
                            required: false,
                        },
                        {
                            model: Remision,
                            attributes: ['id_remision', 'folio_remision', 'total_remision', 'id_factura'],
                            required: false,
                        },
                    ],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // Historial completo de pagos de una CxC incluyendo datos del CFDI de pago
    getHistorialCxC: async (id_cxc: string) => {
        return await Pago_CxC.findAll({
            where: { id_cxc },
            include: [
                { model: Cat_Metodo_Pago, attributes: ['id_metodo_pago', 'descripcion_metodo_pago'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_de_pago', 'descripcion_forma_de_pago'] },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_captura',
                    as: 'empleado_captura',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
                {
                    model: Empleado,
                    foreignKey: 'id_empleado_aplica',
                    as: 'empleado_aplica',
                    attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'],
                },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },
};
