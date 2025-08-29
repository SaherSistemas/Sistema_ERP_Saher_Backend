import Ofertas from "../../models/Ofertas/Ofertas";
import {
  ICreateOrUpdateOferta,
  IOferta,
} from "../../interface/Ofertas/Ofertas.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";
import { Op, FindOptions, Transaction, WhereOptions } from "sequelize";
import OfertaAlcance from "../../models/Ofertas/OfertaAlcance";
import OfertaRegla from "../../models/Ofertas/ReglaOferta";

const OfertaIncludes = [
  {
    model: AlcanceOfertas,
    as: "alcances",
  },
  {
  model: OfertaRegla,
    as: "reglas",
  }
];

type RepoOpts = { transaction?: any };


export const OfertaRepository = {
   
  getOfertasSucursal: async ( Params: { id_empre : string, fecha : Date },
    opts: RepoOpts = {} 
      ) => {
      const { id_empre, fecha } = Params;    
    if (!id_empre) throw new Error("getOfertas: falta id_empre");
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
      throw new Error("getOfertas: fecha inválida");
    }
     
    const alcanceOR: WhereOptions[] = [
      { tipo_alcance: "EMPRESA",  id_referencia: id_empre  },
      { tipo_alcance: "GLOBAL",   id_referencia: {[Op.is]: null}},
      { tipo_alcance: "ARTICULO",  id_referencia: {[Op.is]: null}},

    ];
    
     const candidatas = await Ofertas.findAll({
      where: {
        status_oferta: "ACTIVA",
        fecha_ini_oferta: { [Op.lte]: fecha },
        fecha_fin_oferta: { [Op.gte]: fecha },
      },
      include: [
        {
          model: OfertaAlcance,
          as: "alcances"
          // ,
          // required: true,
          // where: { [Op.or]: alcanceOR },
        }, {
          model: OfertaRegla,
          as: "reglas"
        }
      ],
      // distinct: true,
      subQuery: false,
      transaction: opts.transaction,
    });

    return candidatas;
  },
  getAll: async () => {
    return await Ofertas.findAll({
      include: OfertaIncludes,
    });
  },
  getById: async (
    id_oferta: string, options? : { transaction?: Transaction }) => {
    if (isUUID(id_oferta)) {
      return Ofertas.findByPk(id_oferta, {
        include: OfertaIncludes,
        transaction: options?.transaction,
      });
    }
  },
  create: async (data: ICreateOrUpdateOferta, options? : {transaction? : Transaction}) => {
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
      // alcances: data.alcances ?? [],
      // reglas: data.reglas ?? [],
    };

    return await Ofertas.create(
      ofertaCore,
      {
        ...options, //usa la transaccion
        inlcude : [ //crea hijos
          {model: AlcanceOfertas, as: "alcances"},
          {model: OfertaRegla, as: "reglas"},
        ],
    }
  );
  },

  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    if (!isUUID(id)) return null;
    const oferta = await Ofertas.findByPk(id);

    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
}
