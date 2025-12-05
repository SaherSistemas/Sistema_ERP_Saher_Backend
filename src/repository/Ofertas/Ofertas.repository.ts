import Ofertas from "../../models/Ofertas/Ofertas";
import {
  ICreateOrUpdateOferta,
  IOferta,
} from "../../interface/Ofertas/Ofertas.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";
import {
  Op,
  FindOptions,
  Transaction,
  WhereOptions,
  Sequelize,
  literal,
} from "sequelize";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";
import {
  obtenerDiaSemanaISO,
  getLocalTimeInTz,
  getLocalDateInTz,
  parseDiasSemana,
} from "../../interface/Ofertas/Utils/Oferta.Utils";
import { dbLocal } from "../../config/db";


const OfertaIncludes = [
  {
    model: AlcanceOfertas,
    as: "alcances",
  },
  {
    model: ReglaOferta,
    as: "reglas",
  },
];

type RepoOpts = { transaction?: any };

export const OfertaRepository = {



  getOfertasSucursal: async (
    Params: { id_empre: string; fecha: Date; canal?: "PDV" | "ONLINE" | "AMBOS" },
    opts: RepoOpts = {}
  ) => {
    const { id_empre, fecha, canal } = Params;
    if (!id_empre) throw new Error("getOfertas: falta id_empre");
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
      throw new Error("getOfertas: fecha inválida");
    }

    const tz = "America/Mazatlan";
    const localDate = getLocalDateInTz(fecha, tz);
    const localTime = getLocalTimeInTz(fecha, tz);
    const weekdayIso = obtenerDiaSemanaISO(fecha, tz);

    const alcanceOR: WhereOptions[] = [
      { tipo_alcance: "EMPRESA", id_referencia: id_empre },
      { tipo_alcance: "GLOBAL", id_referencia: { [Op.is]: null } },
    ];

    const candidatas = await Ofertas.findAll({
      where: {
        status_oferta: "ACTIVA",
        [Op.and]: [
          Sequelize.literal(`"fecha_ini_oferta"::date <= DATE '${localDate}'`),
          Sequelize.literal(`"fecha_fin_oferta"::date >= DATE '${localDate}'`),
        ],
        ...(canal ? { canal_oferta: { [Op.in]: ["AMBOS", canal] } } : {}),
      },
      // distinct: true,          
      subQuery: false,

      include: OfertaIncludes,
      transaction: opts.transaction,
    });

    function hhmmssToSec(t: string) {
      const [h, m, s] = String(t).split(":").map(Number);
      return (h || 0) * 3600 + (m || 0) * 60 + (isNaN(s) ? 0 : s);
    }

    const nowSec = hhmmssToSec(localTime);

    const aplicables = (candidatas ?? []).filter((o) => {
      const dias = parseDiasSemana(String(o.get("dias_semana") ?? "*"));
      if (!dias.includes(weekdayIso)) return false;

      const iniSec = hhmmssToSec(String(o.get("hora_ini") ?? "00:00:00"));
      const finSec = hhmmssToSec(String(o.get("hora_fin") ?? "23:59:59"));

      if (iniSec === finSec) {
        return nowSec >= iniSec;
      }
      if (iniSec < finSec) {
        return iniSec <= nowSec && nowSec <= finSec;
      }
      return nowSec >= iniSec || nowSec <= finSec;
    });


    return aplicables;
  },
  getAll: async () => {
    return await Ofertas.findAll({
      include: OfertaIncludes,
    });
  },
  getById: async (
    id_oferta: string,
    options?: { transaction?: Transaction }
  ) => {
    if (isUUID(id_oferta)) {
      return Ofertas.findByPk(id_oferta, {
        include: OfertaIncludes,
        transaction: options?.transaction,
      });
    }
  },

  create: async (
    data: ICreateOrUpdateOferta,
    options?: { transaction?: Transaction }
  ) => {
    const run = async (t: Transaction) => {
      const { alcances = [], reglas = [], ...ofertaBase } = data;
      const id_oferta = uuidv4();

      await Ofertas.create({ ...ofertaBase, id_oferta }, { transaction: t });

      const norm = (v?: string | null) =>
        (!v || v.trim?.() === "") ? null : v;

      const normNum = (v: any) =>
        (v === "" || v == null) ? null : Number(v);

      if (alcances.length) {
        await AlcanceOfertas.bulkCreate(
          alcances.map(a => ({
            id_oferta,
            id_alcance: uuidv4(),
            tipo_alcance: a.tipo_alcance,
            id_referencia: a.id_referencia || null,
            params: a.params || null,
          })),
          { transaction: t }
        );
      }

      if (reglas.length) {
        await ReglaOferta.bulkCreate(
          reglas.map(r => ({
            id_oferta,
            id_regla: uuidv4(),
            tipo_beneficio: r.tipo_beneficio,
            valor: normNum(r.valor),
            cantidad_minima: normNum(r.cantidad_minima),
            cantidad_regalo: normNum(r.cantidad_regalo),
            articulo_gratis: norm(r.articulo_gratis),
            monto_minimo_total: normNum(r.monto_minimo_total),
            minimo_articulo: normNum(r.minimo_articulo),
            tope_desc: normNum(r.tope_desc),
            cantidad_max_dias: normNum(r.cantidad_max_dias),
            codigo_cupon: norm(r.codigo_cupon),
            max_usos_cliente: normNum(r.max_usos_cliente),
            max_usos_global: normNum(r.max_usos_global),
            exclusiva: r.exclusiva ?? false,
          })),
          { transaction: t }
        );
      }

      return Ofertas.findByPk(id_oferta, {
        include: ["alcances", "reglas"],
        transaction: t,
      });
    };

    if (options?.transaction) return run(options.transaction);
    return dbLocal.transaction(run);
  },


  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    if (!isUUID(id)) return null;
    const oferta = await Ofertas.findByPk(id);

    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
