import { v4 as uuidv4 } from 'uuid';
import { dbLocal } from '../../../../config/db';
import Pago_Grupo_CxP from '../model/Pago_Grupo_CxP.model';
import Pago_CxP from '../model/Pago_CxP.model';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';

export interface ILineaPagoMultiple {
    id_cxp:      string;
    monto_pago:  number;
}

export const Pago_Grupo_CxP_Repository = {

    registrarPagoMultiple: async (data: {
        fecha_pago:          string;
        id_forma_pago?:      string;
        referencia_pago?:    string;
        notas?:              string;
        url_comprobante?:    string;
        id_empleado_captura?: string;
        lineas:              ILineaPagoMultiple[];   // una por factura
    }) => {
        const t = await dbLocal.transaction();
        try {
            const montoTotal = +data.lineas.reduce((s, l) => s + l.monto_pago, 0).toFixed(2);

            // 1) Crear encabezado del grupo
            const grupo = await Pago_Grupo_CxP.create({
                id_pago_grupo:       uuidv4(),
                fecha_pago:          new Date(data.fecha_pago),
                id_forma_pago:       data.id_forma_pago      ?? null,
                referencia_pago:     data.referencia_pago    ?? null,
                monto_total:         montoTotal,
                notas:               data.notas              ?? null,
                url_comprobante:     data.url_comprobante    ?? null,
                id_empleado_captura: data.id_empleado_captura ?? null,
                created_at:          new Date(),
            }, { transaction: t });

            const pagosCreados: Pago_CxP[] = [];

            // 2) Por cada línea: validar y aplicar pago
            for (const linea of data.lineas) {
                if (!linea.monto_pago || linea.monto_pago <= 0) continue;

                const cxp = await Cuenta_Por_Pagar.findByPk(linea.id_cxp, { transaction: t });
                if (!cxp) throw new Error(`CxP ${linea.id_cxp} no encontrada`);
                if (cxp.estatus_cxp === 'PAG') throw new Error(`La factura ${cxp.folio_factura ?? cxp.id_cxp} ya está pagada`);
                if (cxp.estatus_cxp === 'CAN') throw new Error(`La factura ${cxp.folio_factura ?? cxp.id_cxp} está cancelada`);
                if (linea.monto_pago > Number(cxp.saldo_pendiente))
                    throw new Error(`El pago ($${linea.monto_pago}) excede el saldo de la factura ${cxp.folio_factura ?? cxp.id_cxp} ($${cxp.saldo_pendiente})`);

                // Crear Pago_CxP individual vinculado al grupo
                const pago = await Pago_CxP.create({
                    id_pago_cxp:         uuidv4(),
                    id_cxp:              linea.id_cxp,
                    id_pago_grupo:       grupo.id_pago_grupo,
                    monto_pago:          linea.monto_pago,
                    fecha_pago:          new Date(data.fecha_pago),
                    id_forma_pago:       data.id_forma_pago      ?? null,
                    referencia_pago:     data.referencia_pago    ?? null,
                    notas:               data.notas              ?? null,
                    url_comprobante:     data.url_comprobante    ?? null,
                    id_empleado_captura: data.id_empleado_captura ?? null,
                    estatus_pago:        'APL',
                    created_at:          new Date(),
                }, { transaction: t });

                pagosCreados.push(pago);

                // Actualizar saldo de la CxP
                const nuevoMontoPagado = +(Number(cxp.monto_pagado) + linea.monto_pago).toFixed(2);
                const nuevoSaldo       = +(Number(cxp.monto_total)  - nuevoMontoPagado).toFixed(2);
                const nuevoEstatus     = nuevoSaldo <= 0 ? 'PAG' : 'PAR';

                await Cuenta_Por_Pagar.update({
                    monto_pagado:    nuevoMontoPagado,
                    saldo_pendiente: Math.max(0, nuevoSaldo),
                    estatus_cxp:     nuevoEstatus,
                }, { where: { id_cxp: linea.id_cxp }, transaction: t });

                // Si quedó pagada, marcar la factura vinculada como PAGADA
                if (nuevoEstatus === 'PAG' && cxp.id_factura_proveedor) {
                    await Factura_Compra_Proveedor.update(
                        { estatus_pago_factura: 'PAGADA' },
                        { where: { id_factura_proveedor: cxp.id_factura_proveedor }, transaction: t }
                    );
                }
            }

            await t.commit();
            return { grupo, pagos: pagosCreados };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    getById: async (id_pago_grupo: string) => {
        return await Pago_Grupo_CxP.findByPk(id_pago_grupo, {
            include: [
                { model: Cat_Forma_De_Pago },
                { model: Empleado, attributes: ['id_empleado', 'nombre_empleado', 'ap_pat_empleado'] },
                {
                    model: Pago_CxP,
                    as: 'pagos',
                    include: [{ model: Cuenta_Por_Pagar, attributes: ['id_cxp', 'folio_factura', 'id_proveedor'] }],
                },
            ],
        });
    },
};
