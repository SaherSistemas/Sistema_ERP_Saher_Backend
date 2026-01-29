
import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../repositories/Stock_Ubicacion_Lote.repository";
import { Ubicacion_SucursalRepository } from "../../Ubicaciones/repositories/Ubicacion_Sucursal.repository";
import { IAddStockDTO } from "../interface/Stock_Ubicacion_Lote.interface";
import LoteArticuloSucursal from "../../../../models/LotesYCaducidad/Lote_ArticuloSucursal";
import Articulo from "../../Articulos/model/Articulo";

export const Stock_Ubicacion_LoteService = {
    addStock: async (dto: IAddStockDTO) => {
        if (!dto.id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!dto.id_ubicacion_sucursal) throw new Error("id_ubicacion_sucursal requerido");
        if (!Number.isInteger(dto.cantidad) || dto.cantidad <= 0) throw new Error("cantidad debe ser entero > 0");

        return await dbLocal.transaction(async (tx) => {
            const ubic = await Ubicacion_SucursalRepository.findById(dto.id_ubicacion_sucursal);
            if (!ubic) throw new Error("Ubicación no existe");
            if (ubic.id_empresa_sucursal !== dto.id_empresa_sucursal) throw new Error("Ubicación no pertenece a la sucursal");

            // Resolver lote
            const id_lote = dto.id_lote?.trim();
            if (!id_lote) throw new Error("id_lote requerido");

            const lote = await LoteArticuloSucursal.findByPk(id_lote, { transaction: tx });
            if (!lote) throw new Error("Lote no existe");

            // Resolver artículo (desde lote) y opcional validar por CB
            const id_articulo = (lote as any).id_artic || (lote as any).id_articulo; // ajusta a tu campo real
            if (!id_articulo) throw new Error("El lote no tiene id_articulo asociado");

            if (dto.cod_barr_artic) {
                const art = await Articulo.findOne({
                    where: { cod_barr_artic: dto.cod_barr_artic },
                    transaction: tx,
                });
                if (!art) throw new Error("Código de barras no existe");
                const idArt = (art as any).id_artic || (art as any).id_articulo;
                if (idArt !== id_articulo) throw new Error("El lote no corresponde al artículo del código de barras");
            }

            // Regla: ESTANTERIA solo 1 artículo distinto
            if (ubic.tipo_ubicacion === "ESTANTERIA") {
                const ids = await Stock_Ubicacion_LoteRepository.getDistinctArticuloIdsInUbicacion(ubic.id_ubicacion_sucursal, tx);
                const yaTieneOtro = ids.length > 0 && !ids.includes(id_articulo);
                if (yaTieneOtro) {
                    throw new Error("Esta ubicación de estantería ya tiene otro producto asignado");
                }
            }

            // Acumular stock por (ubicacion, lote)
            return await Stock_Ubicacion_LoteRepository.upsertAcumular(
                {
                    id_ubicacion_sucursal: ubic.id_ubicacion_sucursal,
                    id_articulo,
                    id_lote,
                    cantidad: dto.cantidad,
                    cantidad_apartada: dto.cantidad_apartada,
                },
                tx
            );
        });
    },

    getStockByUbicacion: async (id_ubicacion_sucursal: string) =>
        Stock_Ubicacion_LoteRepository.getStockByUbicacion(id_ubicacion_sucursal),
};