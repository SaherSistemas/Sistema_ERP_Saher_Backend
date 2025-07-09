import {ILoteUsadoVenta, ICreateOrUpdateLoteUsadoVenta} from "../../interface/LotesYCaducidad/Lote_Usado_Venta.interaface"
import { LoteUsadoVentaRepository, } from "../../repository/LotesYCaducidad/Lote_Usado_Venta.repository"



export const LotesUsadoVentaService = {
    getAll: async (): Promise<ILoteUsadoVenta[]> => {
            return await LoteUsadoVentaRepository.getAll();
        },
     getById: async (id: string): Promise<ILoteUsadoVenta> => {
            const loteartic = await LoteUsadoVentaRepository.getById(id)
            if (!loteartic) throw new Error("Lote Articulo Sucursal no enocontrado")
            return loteartic
        },
    create : async (data : ICreateOrUpdateLoteUsadoVenta) => {
            return LoteUsadoVentaRepository.create(data);
    },
    // update : async (id_lote_sucursal: string , data : ICreateOrUpdateLoteUsadoVenta) => {
    //         return await LoteUsadoVentaRepository.update(id_lote_sucursal, data);
        
    // }
}