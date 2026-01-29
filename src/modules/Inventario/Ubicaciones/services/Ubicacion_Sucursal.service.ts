
import e from "cors";
import { ICrearUbicacionDTO } from "../interface/Ubicacion_Sucursal.interface";
import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";
import { Ubicacion_SucursalRepository } from "../repositories/Ubicacion_Sucursal.repository";
import { AuthRepository } from "../../../Seguridad/auth/Auth.respository";
import { ArticuloRepository } from "../../Articulos/repositories/Articulo.repository";
import { dbLocal } from "../../../../config/db";
import { Transaction } from "sequelize";
import { Ubicacion_ArticuloRepository } from "../repositories/Ubicacion_Articulo.repository";

const norm = (v?: string | null) => (v ?? "").trim();
const up = (v?: string | null) => norm(v).toUpperCase();
const pad2 = (v?: string | null) => norm(v).padStart(2, "0");

export const Ubicacion_SucursalService = {
    create: async (dto: ICrearUbicacionDTO) => {

        if (!dto?.id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!dto?.tipo_ubicacion) throw new Error("tipo_ubicacion requerido");

        // 1) Resolver artículo por código de barras
        const cb = norm(dto.cod_barr_artic);
        if (!cb) throw new Error("cod_barr_artic requerido");

        const articulo = await ArticuloRepository.getByCodigoBarras(cb);
        if (!articulo) throw new Error("Artículo no encontrado con el código de barras proporcionado");

        const id_articulo = (articulo as any).id_artic ?? (articulo as any).id_articulo;
        if (!id_articulo) throw new Error("El artículo no tiene id");

        // 2) Crear ubicación física
        let ubicacionCreada: any;

        if (dto.tipo_ubicacion === "TARIMA") {
            const tar = up(dto.tarima_ub);
            if (!tar) throw new Error("tarima_ub requerida");

            const existeTarima = await Ubicacion_SucursalRepository.existsTarima(
                dto.id_empresa_sucursal,
                tar,

            );
            if (existeTarima) throw new Error("La tarima ya existe en esta sucursal");

            ubicacionCreada = await Ubicacion_SucursalRepository.create(
                {
                    id_empresa_sucursal: dto.id_empresa_sucursal,
                    tipo_ubicacion: "TARIMA",
                    tarima_ub: tar,
                    pasillo_ub: null,
                    anaquel_ub: null,
                    nivel_ub: null,
                    posicion_ub: null,
                    activo: true,
                },

            );
        } else {
            // ESTANTERIA
            const pasillo = up(dto.pasillo_ub);
            const anaquel = pad2(dto.anaquel_ub);
            const nivel = pad2(dto.nivel_ub);
            const posicion = pad2(dto.posicion_ub);

            if (!pasillo || !anaquel || !nivel || !posicion) {
                throw new Error("pasillo/anaquel/nivel/posicion requeridos");
            }

            const existeLayout = await Ubicacion_SucursalRepository.existsEstanteriaLayout(
                dto.id_empresa_sucursal,
                pasillo,
                anaquel,
                nivel,
                posicion,
            );
            if (existeLayout) throw new Error("La ubicación de estantería ya existe");


            // console.log("Antes de crear la ubicación");
            ubicacionCreada = await Ubicacion_SucursalRepository.create(
                {
                    id_empresa_sucursal: dto.id_empresa_sucursal,
                    tipo_ubicacion: "ESTANTERIA",
                    tarima_ub: null,
                    pasillo_ub: pasillo,
                    anaquel_ub: anaquel,
                    nivel_ub: nivel,
                    posicion_ub: posicion,
                    activo: true,
                },

            );
            //console.log(ubicacionCreada)

            // 3) Regla: estantería no puede tener 2 artículos
            const ocupante = await Ubicacion_ArticuloRepository.findByUbicacion(
                dto.id_empresa_sucursal,
                ubicacionCreada.id_ubicacion_sucursal,

            );
            if (ocupante && ocupante.id_articulo !== id_articulo) {
                throw new Error("Este anaquel ya tiene un artículo asignado");
            }
        }

        // 4) Asignar/Reasignar artículo (1 ubicación por artículo)
        const asignacionActual = await Ubicacion_ArticuloRepository.findByArticulo(
            dto.id_empresa_sucursal,
            id_articulo,

        );

        if (!asignacionActual) {
            await Ubicacion_ArticuloRepository.create(
                {
                    id_empresa_sucursal: dto.id_empresa_sucursal,
                    id_articulo,
                    id_ubicacion_sucursal: ubicacionCreada.id_ubicacion_sucursal,
                },

            );
        } else {
            // si ya estaba asignado a otra ubicación, lo movemos
            if (asignacionActual.id_ubicacion_sucursal !== ubicacionCreada.id_ubicacion_sucursal) {
                await Ubicacion_ArticuloRepository.updateUbicacion(
                    asignacionActual.id_ubicacion_articulo,
                    ubicacionCreada.id_ubicacion_sucursal,

                );
            }
        }

        return ubicacionCreada;
    },

    getAll: async (id_empresa_sucursal: string) => {
        return await Ubicacion_SucursalRepository.getAllBySucursal(id_empresa_sucursal);
    },

    getByIDArticulo: async (id_empresa_sucursal: string, id_articulo: string) => {
        return await Ubicacion_ArticuloRepository.getByIDArticulo(id_empresa_sucursal, id_articulo);
    }
};