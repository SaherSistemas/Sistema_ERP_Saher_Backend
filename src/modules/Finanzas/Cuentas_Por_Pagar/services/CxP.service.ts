import { CxPRepository } from '../repositories/CxP.repository';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import Factura_Compra_Proveedor from '../model/Factura_Compra_Proveedor';
import Compra_Proveedor from '../../../Compras/Ordenes-Compra/model/Compra_Proveedor';
import Cuenta_Por_Pagar from '../model/Cuenta_Por_Pagar.model';

export const CxPService = {

    getAll: async (filtros: {
        id_proveedor?: string;
        estatus_cxp?:  string;
        fecha_inicio?: string;
        fecha_fin?:    string;
        vencidas?:     boolean;
    }) => {
        await CxPRepository.marcarVencidas();
        return await CxPRepository.getAll(filtros);
    },

    getByProveedor: async (id_proveedor: string) => {
        return await CxPRepository.getByProveedor(id_proveedor);
    },

    getById: async (id_cxp: string) => {
        const cxp = await CxPRepository.getById(id_cxp);
        if (!cxp) throw new Error('Cuenta por pagar no encontrada');
        return cxp;
    },

    create: async (data: {
        id_factura_proveedor?: string;
        id_proveedor:    string;
        folio_factura?:  string;
        fecha_factura?:  string;
        fecha_vencimiento: string;
        monto_total:     number;
        notas?:          string;
        id_empleado_registro?: string;
    }) => {
        if (!data.monto_total || data.monto_total <= 0)
            throw new Error('El monto total debe ser mayor a 0');
        return await CxPRepository.create(data);
    },

    registrarPago: async (data: {
        id_cxp:           string;
        monto_pago:       number;
        fecha_pago:       string;
        id_forma_pago?:   string;
        referencia_pago?: string;
        notas?:           string;
        url_comprobante?: string;
        id_empleado_captura?: string;
    }) => {
        if (!data.monto_pago || data.monto_pago <= 0)
            throw new Error('El monto del pago debe ser mayor a 0');
        return await CxPRepository.registrarPago(data);
    },

    getDashboard: async () => {
        const [resumen, creditoPorProveedor, antiguedad] = await Promise.all([
            CxPRepository.getResumen(),
            CxPRepository.getCreditoPorProveedor(),
            CxPRepository.getAntiguedad(),
        ]);
        return { resumen, creditoPorProveedor, antiguedad };
    },

    marcarVencidas: async () => {
        await CxPRepository.marcarVencidas();
        return { ok: true };
    },

    // Genera CxP para todas las facturas chequeadas que aún no tienen una
    generarCxPDesdeFacturasExistentes: async () => {
        // Traer facturas chequeadas (H o D) con su compra y proveedor
        const facturas = await Factura_Compra_Proveedor.findAll({
            where: { estado_factura_proveedor: { [Op.in]: ['H', 'D'] } },
            include: [{ model: Compra_Proveedor, as: 'compra' }],
        }) as any[];

        let creadas = 0;
        let omitidas = 0;

        for (const factura of facturas) {
            // Verificar si ya tiene CxP
            const existe = await Cuenta_Por_Pagar.findOne({
                where: { id_factura_proveedor: factura.id_factura_proveedor },
            });
            if (existe) { omitidas++; continue; }

            const monto = +(
                Number(factura.total_recibido_factura || factura.total_factura_proveedor) +
                Number(factura.total_iva_recibido_factura || factura.total_iva_factura)
            ).toFixed(2);

            if (!monto || monto <= 0) { omitidas++; continue; }
            if (!factura.compra?.idprove_comp) { omitidas++; continue; }

            await Cuenta_Por_Pagar.create({
                id_cxp:               uuidv4(),
                id_factura_proveedor: factura.id_factura_proveedor,
                id_proveedor:         factura.compra.idprove_comp,
                folio_factura:        factura.folio_factura_proveedor ?? null,
                fecha_factura:        factura.fecha_emision ?? null,
                fecha_vencimiento:    factura.fecha_vencimiento,
                monto_total:          monto,
                monto_pagado:         0,
                saldo_pendiente:      monto,
                estatus_cxp:          'PEN',
                notas:                `Migración automática desde factura ${factura.folio_factura_proveedor ?? factura.id_factura_proveedor}`,
            });
            creadas++;
        }

        return { total_facturas: facturas.length, creadas, omitidas };
    },
};
