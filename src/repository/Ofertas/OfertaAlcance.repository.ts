import { ICreateOrUpdateAlcanceOferta } from "../../interface/Ofertas/AlcanceOferta.interface";
import { v4 as uuidv4 } from "uuid";
import { isUUID } from "../../utils/validaciones";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";
import { BulkCreateOptions, CreateOptions } from "sequelize";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";
import Ofertas from "../../models/Ofertas/Ofertas";





function normalizeParams(data: ICreateOrUpdateAlcanceOferta) {
  let params = data.params ?? null;

  if (params && (params as any).tipo === 'CADUCIDAD' && data.tipo_alcance != 'LOTE') {
    throw new Error("Alcance CADUCIDAD reuqiere tipo_alcance = 'LOTE'.")
  }

  if (params && (params as any).tipo === 'CADUCIDAD') {
    const p = params as any;
    if (typeof p.solo_stock_disponible === 'undefined') p.solo_stock_disponible = true;
    if (typeof p.incluir_vencidos === 'undefined') p.incluir_vencidos = false;
  }
  return { ...data, params };
}

export const AlcanceOfertaRepository = {
  getAll: async () => {
    return await AlcanceOfertas.findAll({
      include: [
        {
          model: Ofertas,
          attributes: ["nombre_oferta"],
        },
      ],
    }

    );
  },

  getById: async (id_alcance: string) => {
    if (isUUID(id_alcance)) {
      return await AlcanceOfertas.findByPk(id_alcance);
    }
  },

  create: async (data: ICreateOrUpdateAlcanceOferta, options?: CreateOptions) => {
    const normalizedData = normalizeParams(data);
    return await AlcanceOfertas.create(
      { id_alcance: uuidv4(), ...normalizedData },
      options
    );
  },

  bulkCreate: async (
    rows: ICreateOrUpdateAlcanceOferta[],
    options?: BulkCreateOptions
  ) => {
    const mapped = rows.map(r => ({ id_alcance: uuidv4(), ...normalizeParams(r) }));
    return await AlcanceOfertas.bulkCreate
      (mapped,
        options
      );
  },


  update: async (id: string, data: Partial<ICreateOrUpdateAlcanceOferta>) => {
    if (!isUUID(id)) return null;
    const alcanceOferta = await AlcanceOfertas.findByPk(id);
    if (!alcanceOferta) return null;


    const payload = normalizeParams({
      id_oferta: alcanceOferta.id_oferta,
      tipo_alcance: data.tipo_alcance ?? alcanceOferta.tipo_alcance,
      id_referencia: (data.id_referencia ?? alcanceOferta.id_referencia) as any,
      params: (data.params ?? alcanceOferta.params) as any,
    });

    await alcanceOferta.update(payload);
    return alcanceOferta;
  },
};
