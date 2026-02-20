import Ubicacion_Sucursal from "../model/Ubicacion_Sucursal";
import { v4 as uuidv4 } from 'uuid';
import { col, fn, Op, Transaction } from "sequelize";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";
import Articulo_Ubicacion_Default from "../../../Catalogos/Articulos/feature/Articulo_Ubicacion_Default/model/Articulo_Ubicacion_Default";
import { GetAllFilters } from "../interface/Ubicacion_Sucursal.interface";
import Stock_Ubicacion_Lote from "../../../Inventario/Stock/model/Stock_Ubicacion_Lote";
import { Stock_Ubicacion_LoteRepository } from "../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository";

const norm = (v?: string | null) => (v ?? "").trim();
const up = (v?: string | null) => norm(v).toUpperCase();
const pad2 = (v: any) => String(v ?? "").trim().padStart(2, "0");
export const Ubicacion_SucursalRepository = {
    getMetaBySucursal: async (id_empresa_sucursal: string) => {
        // Distinct de pasillo+anaquel para estantería
        const rows = await Ubicacion_Sucursal.findAll({
            attributes: [
                [col("pasillo_ub"), "pasillo_ub"],
                [col("anaquel_ub"), "anaquel_ub"],
            ],
            where: {
                id_empresa_sucursal,
                activo: true,
                tarima_ub: { [Op.is]: null },          // solo estantería
                pasillo_ub: { [Op.not]: null },
                anaquel_ub: { [Op.not]: null },
            },
            group: ["pasillo_ub", "anaquel_ub"],
            raw: true,
        });

        // Normaliza y arma estructura
        const anaquelesPorPasillo: Record<string, string[]> = {};
        const pasillosSet = new Set<string>();

        for (const r of rows as any[]) {
            const p = norm(r?.pasillo_ub);
            const a = pad2(r?.anaquel_ub);
            if (!p || !a) continue;

            pasillosSet.add(p);
            if (!anaquelesPorPasillo[p]) anaquelesPorPasillo[p] = [];
            if (!anaquelesPorPasillo[p].includes(a)) anaquelesPorPasillo[p].push(a);
        }

        const pasillos = Array.from(pasillosSet).sort();
        for (const p of pasillos) anaquelesPorPasillo[p].sort();

        return { pasillos, anaquelesPorPasillo };
    },

    getAllBySucursalFiltered: async (id_empresa_sucursal: string, f: any) => {
        const where: any = {
            id_empresa_sucursal,
            activo: true,
        };

        // tipo
        if (f?.tipo) {
            const t = norm(f.tipo);
            if (t === "TARIMA") where.tarima_ub = { [Op.not]: null };
            else if (t === "ESTANTERIA") where.tarima_ub = { [Op.is]: null };
        }

        // pasillo / anaquel
        if (f?.pasillo) where.pasillo_ub = norm(f.pasillo);
        if (f?.anaquel) where.anaquel_ub = pad2(f.anaquel);

        // include defaults opcional
        const include = f?.include_defaults
            ? [
                {
                    model: Articulo_Ubicacion_Default,
                    required: false,
                    attributes: ["id_articulo_ubicacion_default", "id_articulo"],
                    include: [
                        {
                            model: Articulo,
                            required: false,
                            attributes: ["id_artic", "des_artic", "cod_barr_artic"],
                        },
                    ],
                },
            ]
            : [];

        // 1) trae ubicaciones
        const rows = await Ubicacion_Sucursal.findAll({
            where,
            order: [["createdAt", "DESC"]],
            include,
        });

        const plain = rows.map((r: any) => (r.get ? r.get({ plain: true }) : r));

        // 👇 AJUSTA ESTA LÍNEA al nombre real de tu PK
        // En tu repo de stock usas "id_ubicacion_sucursal", así que normalmente tu PK se llama igual.
        const ids = plain
            .map((u: any) => u.id_ubicacion_sucursal || u.id)
            .filter(Boolean)
            .map(String);

        // 2) trae existencias totales por ubicación (el método que hiciste)
        const exRows = await Stock_Ubicacion_LoteRepository.getExistenciasTotalesPorUbicacion(
            id_empresa_sucursal,
            ids
        );

        const exMap = new Map<string, number>();
        for (const r of (exRows as any[]) || []) {
            exMap.set(String(r.id_ubicacion_sucursal), Number(r.existencia || 0));
        }

        // 3) merge: agrega existencia a cada ubicación
        return plain.map((u: any) => {
            const id = String(u.id_ubicacion_sucursal || u.id || "");
            return {
                ...u,
                existencia: exMap.get(id) ?? 0,
            };
        });
    },
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