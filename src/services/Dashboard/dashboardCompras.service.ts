import { Op, WhereOptions } from 'sequelize';

import { ICompraKPISRequest } from "../../interface/Dashboard/Compras.interface";
import { CompraGeneralRepository } from '../../repository/Compras/Compra_General.repository';
import { Compra_ProveedorRepository } from '../../repository/Compras/Compra_Proveedor.repository';


export const dashboardComprasService = {
    getAllCompraKPIS: async (empresaId: string, getAllCompraKPIS: ICompraKPISRequest) => {
        const { estadoHijo, from, q, to } = getAllCompraKPIS
        const whereCG: WhereOptions = { id_empresa_sucursal: empresaId };
        if (from || to) {
            const toDate = to ? new Date(to) : undefined;
            if (toDate) toDate.setDate(toDate.getDate() + 1);
            whereCG['fecha_inicio'] = {
                ...(from ? { [Op.gte]: new Date(from) } : {}),
                ...(toDate ? { [Op.lt]: toDate } : {}),
            };
        }
        if (q?.trim()) {
            const like = { [Op.iLike]: `%${q.trim()}%` };
            Object.assign(whereCG, {
                [Op.or]: [
                    { id_interno_compra_gen: like },
                    { '$empresa.nom_empre$': like },
                    { ultimo_articulo_guardado: like },
                ],
            });
        }

        const totales = await CompraGeneralRepository.getTotales(whereCG);

        const totalComprasGenerales = Number(totales?.[0]?.total_compra_general ?? 0);
        const montoTotalConIva = Number(totales?.[0]?.total_iva_compra_general ?? 0) + totalComprasGenerales;


        // 2) IDs de generales
        const idsGenerales = await CompraGeneralRepository.getIdsGenerales(whereCG);

        const whereCP: any = { id_compra_general: { [Op.in]: idsGenerales } };
        if (estadoHijo) whereCP.estado_comp = estadoHijo;
        if (q?.trim()) {
            whereCP[Op.or] = [
                { folio_factura_compra: { [Op.iLike]: `%${q.trim()}%` } },
                { '$proveedor.nomcort_prove$': { [Op.iLike]: `%${q.trim()}%` } },
            ];
        }
        const hijosPorEstado = await Compra_ProveedorRepository.getHijosPorEstado(whereCP);
        // console.log("HijosPorEstado", hijosPorEstado)
        const estados = {
            R: Number(hijosPorEstado.R ?? 0),
            A: Number(hijosPorEstado.A ?? 0),
            F: Number(hijosPorEstado.F ?? 0),
            D: Number(hijosPorEstado.D ?? 0),
        };
        //console.log("ESTAFOS", estados)
        //console.log(estados)
        return { totalComprasGenerales, montoTotalConIva, estados };
    },


}