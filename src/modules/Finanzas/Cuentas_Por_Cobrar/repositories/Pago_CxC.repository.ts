import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Pago_CxC from '../model/Pago_CxC.model';
import Cat_Metodo_Pago from '../../../Catalogos/model/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';
import { ICapturarPago } from '../interface/CxC.interface';

export const Pago_CxCRepository = {

    // Paso 1 — Solo guarda el pago como CAP, sin tocar la CxC
    capturar: async (data: ICapturarPago, t: Transaction) => {
        return await Pago_CxC.create({
            id_pago_cxc:          uuidv4(),
            id_cxc:               data.id_cxc,
            id_metodo_pago:       data.id_metodo_pago,
            id_forma_pago:        data.id_forma_pago,
            monto_pago:           data.monto_pago,
            fecha_pago:           data.fecha_pago,
            referencia_pago:      data.referencia_pago ?? null,
            id_empleado_captura:  data.id_empleado_captura,
            id_empleado_aplica:   null,
            fecha_aplicado:       null,
            notas:                data.notas ?? null,
            estatus_pago:         'CAP',
        }, { transaction: t });
    },

    // Paso 2 — Marca el pago como APL y registra quién lo aplicó y cuándo
    marcarAplicado: async (id_pago_cxc: string, id_empleado_aplica: string, t: Transaction) => {
        const [, [pago]] = await Pago_CxC.update(
            {
                estatus_pago:       'APL',
                id_empleado_aplica,
                fecha_aplicado:     new Date(),
            },
            {
                where:     { id_pago_cxc },
                returning: true,
                transaction: t,
            }
        );
        return pago;
    },

    // Pagos capturados pendientes de aplicar (para que el encargado los vea)
    getPendientesDeAplicar: async () => {
        return await Pago_CxC.findAll({
            where: { estatus_pago: 'CAP' },
            include: [
                { model: Cat_Metodo_Pago,   attributes: ['id_metodo_pago', 'descripcion'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_pago',  'descripcion'] },
                { model: Empleado, foreignKey: 'id_empleado_captura', as: 'empleado_captura', attributes: ['id_empleado', 'nombre_empleado'] },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    // Todos los pagos de una CxC
    getByIdCxC: async (id_cxc: string) => {
        return await Pago_CxC.findAll({
            where: { id_cxc },
            include: [
                { model: Cat_Metodo_Pago,   attributes: ['id_metodo_pago', 'descripcion'] },
                { model: Cat_Forma_De_Pago, attributes: ['id_forma_pago',  'descripcion'] },
                { model: Empleado, foreignKey: 'id_empleado_captura', as: 'empleado_captura', attributes: ['id_empleado', 'nombre_empleado'] },
                { model: Empleado, foreignKey: 'id_empleado_aplica',  as: 'empleado_aplica',  attributes: ['id_empleado', 'nombre_empleado'] },
            ],
            order: [['fecha_pago', 'ASC']],
        });
    },

    getById: async (id_pago_cxc: string) => {
        return await Pago_CxC.findByPk(id_pago_cxc);
    },
};
