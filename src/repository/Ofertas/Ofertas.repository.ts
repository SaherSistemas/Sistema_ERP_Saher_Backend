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
  parseDiasSemana,
  getLocalTimeInTz,
  getLocalDateInTz,
} from "../../interface/Ofertas/Utils/Oferta.Utils";


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
  const localDate  = getLocalDateInTz(fecha, tz);      
  const localTime  = getLocalTimeInTz(fecha, tz);   
  const weekdayIso = obtenerDiaSemanaISO(fecha, tz);   

  const alcanceOR: WhereOptions[] = [
    { tipo_alcance: "EMPRESA", id_referencia: id_empre },
    { tipo_alcance: "GLOBAL",  id_referencia: { [Op.is]: null } },
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

    include:OfertaIncludes, 
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
    const ofertaCore = {
      id_oferta: uuidv4(),
      nombre_oferta: data.nombre_oferta,
      descripcion: data.descripcion,
      fecha_ini_oferta: data.fecha_ini_oferta,
      fecha_fin_oferta: data.fecha_fin_oferta,
      dias_semana: data.dias_semana,
      hora_ini: data.hora_ini,
      hora_fin: data.hora_fin,
      creada_por: data.creada_por,
      canal_oferta: data.canal_oferta,
      status_oferta: data.status_oferta,
   
    };

    return await Ofertas.create(ofertaCore, {
      ...options, 
      include: [
        { model: AlcanceOfertas, as: "alcances" },
        { model: ReglaOferta, as: "reglas" },
      ],
    });
  },

  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    if (!isUUID(id)) return null;
    const oferta = await Ofertas.findByPk(id);

    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
