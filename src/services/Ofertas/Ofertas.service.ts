import { dbLocal } from "../../config/db";
import {
  IOferta,
  ICreateOrUpdateOferta,
} from "../../interface/Ofertas/Ofertas.interface";
import { AlcanceOfertaRepository } from "../../repository/Ofertas/OfertaAlcance.repository";
import { OfertaRepository } from "../../repository/Ofertas/Ofertas.repository";
import { v4 as uuidv4 } from "uuid";
import { ReglaOfertaRepository } from "../../repository/Ofertas/ReglaOferta.repository";
import AlcanceOfertas from "../../models/Ofertas/OfertaAlcance";
import ReglaOferta from "../../models/Ofertas/ReglaOferta";

export const OfertaService = {
  getOfertas: async (args: {
    id_empre: string;
    fecha?: string | Date; // ISO o Date
    canal?: string; // 'PDV' por defecto
    id_cliente?: string; // para límites por cliente
  }) => {
    const { id_empre, canal = "PDV" } = args;
      if (!id_empre) throw new Error("Faltan parámetros");


    const fecha =
      typeof args.fecha === "string"
        ? new Date(args.fecha)
        : args.fecha instanceof Date
        ? args.fecha
        : new Date();

    const candidatasSucursal = await OfertaRepository.getOfertasSucursal({id_empre,fecha});
    return candidatasSucursal;
  },

  getAll: async () => {
    return await OfertaRepository.getAll();
  },
  getById: async (id_oferta: string) => {
    const oferta = await OfertaRepository.getById(id_oferta);
    if (!oferta) throw new Error("Oferta no enocontrada");
    return oferta;
  },
  create: async (data: ICreateOrUpdateOferta) => {
    return await OfertaRepository.create(data);
  },
  createOferta: async (data: ICreateOrUpdateOferta) => {
    const t = await dbLocal.transaction();
    try {
      if (!data.alcances?.length)
        throw new Error("Debes enviar al menos un alcance.");
      if (!data.reglas?.length)
        throw new Error("Debes enviar al menos una regla.");
      const {
        alcances,
        reglas,
        nombre_oferta,
        descripcion,
        fecha_ini_oferta,
        fecha_fin_oferta,
        dias_semana,
        hora_ini,
        hora_fin,
        creada_por,
        canal_oferta,
        status_oferta,
      } = data;

      const oferta = await OfertaRepository.create(
        {
          nombre_oferta,
          descripcion,
          fecha_ini_oferta,
          fecha_fin_oferta,
          dias_semana,
          hora_ini,
          hora_fin,
          creada_por,
          canal_oferta,
          status_oferta,
          alcances,
          reglas,
        },
        { transaction: t }
      );
      const id_oferta = oferta.id_oferta;

      await AlcanceOfertas.bulkCreate(
        data.alcances.map((a) => ({
          id_alcance: uuidv4(),
          id_oferta: oferta.id_oferta,
          tipo_alcance: a.tipo_alcance,
          id_referencia: a.id_referencia,
        })),
        { transaction: t }
      );

      await ReglaOferta.bulkCreate(
        data.reglas.map((r) => ({
          id_oferta: oferta.id_oferta,
          id_regla: uuidv4(),
          valor: r.valor,
          tipo_beneficio: r.tipo_beneficio,
          cantidad_minima: r.cantidad_minima,
          cantidad_regalo: r.cantidad_regalo,
          articulo_gratis: r.articulo_gratis,
          monto_minimo_total: r.monto_minimo_total,
          minimo_articulo: r.minimo_articulo,
          tope_desc: r.tope_desc,
          cantidad_max_dias: r.cantidad_max_dias,
          codigo_cupon: r.codigo_cupon,
          max_usos_cliente: r.max_usos_cliente,
          max_usos_global: r.max_usos_global,
          exclusiva: r.exclusiva,
        })),
        { transaction: t }
      );
      const OfertaCreada = await OfertaRepository.getById(id_oferta, {
        transaction: t,
      });

      await t.commit();
      return { message: "Oferta creada exitosamente", oferta: OfertaCreada };
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
  update: async (id: string, data: Partial<ICreateOrUpdateOferta>) => {
    const oferta = await OfertaRepository.getById(id);
    if (!oferta) return null;
    await oferta.update(data);
    return oferta;
  },
};
