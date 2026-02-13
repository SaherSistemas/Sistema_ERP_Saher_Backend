import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from "sequelize";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";
import Articulo_Ubicacion_Default from "../../Articulo_Ubicacion_Default/model/Articulo_Ubicacion_Default";

const norm = (v?: string | null) => (v ?? "").trim();
const up = (v?: string | null) => norm(v).toUpperCase();

export const Ubicacion_SucursalRepository = {
    findById: async (id: string) =>
        Ubicacion_Sucursal.findByPk(id),

    getAllBySucursal: async (id_empresa_sucursal: string) =>
        Ubicacion_Sucursal.findAll({
            where: {
                id_empresa_sucursal,
                activo: true,
            },
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: Articulo_Ubicacion_Default,
                    required: false,
                    attributes: ["id_articulo_ubicacion_default", "id_articulo"],
                    include: [
                        {
                            model: Articulo,
                            required: false,
                            attributes: [
                                "id_artic",
                                "des_artic",
                                "cod_barr_artic",
                            ],
                        },
                    ],
                },
            ],
        }),

    existsEstanteriaLayout: async (
        id_empresa_sucursal: string,
        pasillo: string,
        anaquel: string,
        nivel: string,
        posicion: string
    ) => {
        const count = await Ubicacion_Sucursal.count({
            where: {
                id_empresa_sucursal,
                tipo_ubicacion: "ESTANTERIA",
                pasillo_ub: up(pasillo),
                anaquel_ub: norm(anaquel),
                nivel_ub: norm(nivel),
                posicion_ub: norm(posicion),
            },
        });
        return count > 0;
    },

    existsTarima: async (id_empresa_sucursal: string, tarima: string, t?: Transaction) => {
        const count = await Ubicacion_Sucursal.count({
            where: { id_empresa_sucursal, tipo_ubicacion: "TARIMA", tarima_ub: tarima },
            transaction: t,
        });
        return count > 0;
    },

    create: async (data: Partial<Ubicacion_Sucursal>, tx?: Transaction) => {

        return await Ubicacion_Sucursal.create({
            ...data,
            id_ubicacion_sucursal_articulo: uuidv4(),
        }, { transaction: tx });
    }



}