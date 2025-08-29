import { CompraGeneralRepository } from "../../repository/Compras/Compra_General.repository";
import { mapCompraGeneral } from "./mappers/compraGeneral.mapper";


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


    finalizarCompras: async (id_empresa_sucursal: string, id_empleado_finaliza: string) => {
        return await CompraGeneralRepository.actualizarEstadoCompras(id_empresa_sucursal, id_empleado_finaliza)
    },

}