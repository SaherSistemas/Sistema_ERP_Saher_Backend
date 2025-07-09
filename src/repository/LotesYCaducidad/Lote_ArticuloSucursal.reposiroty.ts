import Lote_sucursal_articulo from "../../models/LotesYCaducidad/Lote_ArticuloSucursal";
import {ILotesArticuloSucursal, ICreaterOrUdateLotesArticuloSucursal} from "../../interface/LotesYCaducidad/Lote_ArticuloSucursal.interface"

import { isUUID } from "../../utils/validaciones";
import { v4 as uuidv4 } from 'uuid';
import { ArticuloRepository } from "../Articulos/Articulo.repository";

export const LotesArticuloSucursalRepository = {
    getAll: async () => {
            return await Lote_sucursal_articulo.findAll();
          //return await Lote_sucursal_articulo.findAll({ attributes: ['id_lote_sucursal'], raw: true })

        },
        
    getById : async(id : string) => {
         if (isUUID(id)) {
            return await Lote_sucursal_articulo.findByPk(id);
            }
        },
    getLotesPorCodigoBarra : async ( cod_barr_artic : string) => {
        const articulo = await ArticuloRepository.getByIDFlexible(cod_barr_artic);
        const id_artic = articulo.id_artic;
        return Lote_sucursal_articulo.findAll ({
            where : {id_artic}
        })

    },

    create: async (data : ICreaterOrUdateLotesArticuloSucursal) => {
        const nuevoUUID = uuidv4();

         return await Lote_sucursal_articulo.create ({
            id_lote_sucursal: nuevoUUID,
            ...data
         })
    },

    update : async (id_lote_sucursal : string, data : ICreaterOrUdateLotesArticuloSucursal) => {
        const existe = await LotesArticuloSucursalRepository.getById(id_lote_sucursal);
        if (!existe) return null;
        return await existe.update(data)
    }
}