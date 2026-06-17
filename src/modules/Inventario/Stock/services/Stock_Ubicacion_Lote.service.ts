
import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { Stock_Ubicacion_LoteRepository } from "../repositories/Stock_Ubicacion_Lote.repository";
import { IAddStockDTO } from "../interface/Stock_Ubicacion_Lote.interface";
import LoteArticuloSucursal from "../../Lotes/model/Lote_Articulo_Sucursal";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";
import { Ubicacion_SucursalRepository } from "../../../Almacen/Ubicaciones/repositories/Ubicacion_Sucursal.repository";
import { Detalle_Compra_SolicitadoRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Solicitado.repository";
import Stock_Ubicacion_Lote from "../model/Stock_Ubicacion_Lote";


export const Stock_Ubicacion_LoteService = {
    obtenerExistencias: async (id_empresa: string, id_articulo?: string) => {
        const enTransito = await Detalle_Compra_SolicitadoRepository.getCantidadTransitoPorArticulo(id_articulo)
        const existenciasEmpresa = await Stock_Ubicacion_LoteRepository.getExistencias(id_empresa, id_articulo);
        // console.log(existenciasEmpresa)
        console.log(enTransito)
        return { existenciasEmpresa, enTransito };
    },
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
            return
            // Acumular stock por (ubicacion, lote)
            /* return await Stock_Ubicacion_LoteRepository.upsertAcumular(
                 {
                     id_ubicacion_sucursal: ubic.id_ubicacion_sucursal,
                     id_articulo,
                     id_lote,
                     cantidad: dto.cantidad,
                     cantidad_apartada: dto.cantidad_apartada,
                 },
                 tx
             );*/
        });
    },

    getStockByUbicacion: async (id_ubicacion_sucursal: string) =>
        Stock_Ubicacion_LoteRepository.getStockByUbicacion(id_ubicacion_sucursal),

    moverStock: async (dto: {
        id_empresa_sucursal: string;
        id_stock_ubicacion_lote: string;
        cantidad: number;
        id_ubicacion_destino: string;
    }) => {
        const { id_empresa_sucursal, id_stock_ubicacion_lote, cantidad, id_ubicacion_destino } = dto;

        if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("cantidad debe ser entero mayor a 0");

        return await dbLocal.transaction(async (tx) => {
            // 1. Traer fila origen con lock
            const origen = await Stock_Ubicacion_LoteRepository.findByIdForUpdate(
                id_empresa_sucursal, id_stock_ubicacion_lote, tx
            );
            if (!origen) throw new Error("Stock origen no encontrado");

            const disponible = origen.cantidad - origen.cantidad_apartada;
            if (cantidad > disponible)
                throw new Error(`Solo hay ${disponible} unidades disponibles (no apartadas) para mover`);

            // 2. Validar destino
            const destino = await Ubicacion_SucursalRepository.findById(id_ubicacion_destino);
            if (!destino) throw new Error("Ubicación destino no existe");
            if (destino.id_empresa_sucursal !== id_empresa_sucursal)
                throw new Error("La ubicación destino no pertenece a esta sucursal");
            if (destino.id_ubicacion_sucursal === origen.id_ubicacion_sucursal)
                throw new Error("El origen y destino son la misma ubicación");

            // 3. Regla: estantería solo 1 artículo distinto
            if (destino.tipo_ubicacion === "ESTANTERIA") {
                const ids = await Stock_Ubicacion_LoteRepository.getDistinctArticuloIdsInUbicacion(
                    destino.id_ubicacion_sucursal, tx
                );
                const yaTieneOtro = ids.length > 0 && !ids.includes(origen.id_articulo);
                if (yaTieneOtro) throw new Error("La ubicación destino ya tiene otro artículo asignado");
            }

            // 4. Descontar origen
            const nuevaCantOrigen = origen.cantidad - cantidad;
            if (nuevaCantOrigen === 0) {
                await origen.destroy({ transaction: tx });
            } else {
                await origen.update({ cantidad: nuevaCantOrigen }, { transaction: tx });
            }

            // 5. Acumular en destino (buscar fila existente para mismo articulo+lote)
            const filaDestino = await Stock_Ubicacion_Lote.findOne({
                where: {
                    id_empresa_sucursal,
                    id_ubicacion_sucursal: id_ubicacion_destino,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                },
                transaction: tx,
                lock: tx.LOCK.UPDATE,
            });

            if (filaDestino) {
                await filaDestino.update({ cantidad: filaDestino.cantidad + cantidad }, { transaction: tx });
            } else {
                await Stock_Ubicacion_LoteRepository.create({
                    id_empresa_sucursal,
                    id_ubicacion_sucursal: id_ubicacion_destino,
                    id_articulo: origen.id_articulo,
                    id_lote: origen.id_lote,
                    cantidad,
                    cantidad_apartada: 0,
                }, tx);
            }

            return { ok: true, movido: cantidad };
        });
    },
};