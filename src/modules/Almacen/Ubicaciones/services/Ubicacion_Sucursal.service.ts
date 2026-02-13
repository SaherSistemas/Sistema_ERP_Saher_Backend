
import e from "cors";
import { ICrearUbicacionDTO } from "../interface/Ubicacion_Sucursal.interface";
import { ArticuloRepository } from "../../../Catalogos/Articulos/repositories/Articulo.repository";
import { Ubicacion_SucursalRepository } from "../repositories/Ubicacion_Sucursal.repository";
import { Articulo_Ubicacion_DefaultRepository } from "../../Articulo_Ubicacion_Default/repositories/Articulo_Ubicacion_Default.repository";
import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";

const norm = (v?: string | null) => (v ?? "").trim();
const up = (v?: string | null) => norm(v).toUpperCase();
const pad2 = (v?: string | null) => norm(v).padStart(2, "0");

export const Ubicacion_SucursalService = {
    create: async (dto: ICrearUbicacionDTO) => {

        if (!dto?.id_empresa_sucursal) throw new Error("id_empresa_sucursal requerido");
        if (!dto?.tipo_ubicacion) throw new Error("tipo_ubicacion requerido");

        // 1) Resolver artículo por código de barras


        // 2) Crear ubicación física
        let ubicacionCreada: Ubicacion_Sucursal;

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
        }
        return ubicacionCreada;
    },

    getAll: async (id_empresa_sucursal: string) => {
        return await Ubicacion_SucursalRepository.getAllBySucursal(id_empresa_sucursal);
    },


};