import { CompraGeneralRepository } from "../repositories/Compra_General.repository";
import { mapCompraGeneral } from "../mappers/compraGeneral.mapper";
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";
import Compra_Proveedor from "../model/Compra_Proveedor";


export const CompraGeneralesService = {
    getAll: async (id_empresa: string, page: number, limit: number) => {
        return await CompraGeneralRepository.getAllCompra_General(id_empresa, page, limit);
    },
    getEnCaptura: async (id_empresa: string) => {
        return await CompraGeneralRepository.getCompraEnCaptura(id_empresa)
    },

    getComprasGeneralesConFiltro: async (id_empresa: string, rango: { start: Date; end: Date }) => {
        const rows = await CompraGeneralRepository.findByEmpresaYFiltro(id_empresa, rango);
        const plain = rows.map((r: any) => typeof r.get === 'function' ? r.get({ plain: true }) : r);
        //console.log(plain)
        return plain.map(mapCompraGeneral);
    },


    // Regresa a captura una compra ya finalizada para seguir agregando artículos, siempre
    // que NINGUNA de sus órdenes a proveedor se haya enviado todavía.
    reabrirCompra: async (id_compra_general: string) => {
        const compra = await CompraGeneralRepository.findByPK_Compra_General(id_compra_general);
        if (!compra) throw { status: 404, message: 'Compra no encontrada.' };
        if (compra.tipo_compra === 'DIRECTA') {
            throw { status: 400, message: 'Las compras directas no se pueden continuar.' };
        }
        if (compra.estado_comp === 'C') return { ya_en_captura: true };
        if (compra.estado_comp !== 'A') {
            throw { status: 400, message: 'Solo se puede continuar una compra capturada que aún no se envía.' };
        }

        const enCaptura = await CompraGeneralRepository.getCompraEnCaptura(compra.id_empresa_sucursal as any);
        if (enCaptura && enCaptura.id_compra_general !== id_compra_general) {
            throw { status: 409, message: 'Ya hay otra compra en captura. Termínala antes de continuar esta.' };
        }

        const ordenes = await Compra_Proveedor.findAll({
            where: { id_compra_general },
            attributes: ['id_comp', 'estado_comp', 'fecha_enviada_proveedor'],
        });
        if (ordenes.some(o => o.fecha_enviada_proveedor || o.estado_comp !== 'A')) {
            throw { status: 400, message: 'Ya se envió al menos una orden de esta compra; no se puede continuar.' };
        }

        await CompraGeneralRepository.reabrirCompra(id_compra_general);
        return { ya_en_captura: false };
    },

    finalizarCapturaCompraGenYCompraProv: async (id_empresa_sucursal: string, id_empleado_finaliza: string) => {
        const compraGeneral = await CompraGeneralRepository.finalizarCapturaCompraGenYCompraProv(id_empresa_sucursal, id_empleado_finaliza)

        return { compraGeneral };
    },

}