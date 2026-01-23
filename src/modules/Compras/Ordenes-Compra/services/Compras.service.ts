import { CompraGeneralRepository } from "../repositories/Compra_General.repository";
import { mapCompraGeneral } from "../mappers/compraGeneral.mapper";
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";


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


    finalizarCapturaCompraGenYCompraProv: async (id_empresa_sucursal: string, id_empleado_finaliza: string) => {
        const compraGeneral = await CompraGeneralRepository.finalizarCapturaCompraGenYCompraProv(id_empresa_sucursal, id_empleado_finaliza)

        return { compraGeneral };
    },

}