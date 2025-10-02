import { RecetaMedicaRepository } from "../../repository/RecetaMedica/RecetaMedica.repository";
import { Transaction } from "sequelize";
import { dbLocal } from "../../config/db";
import { IRecetaDesdeVenta } from "../../interface/RecetaMedica/RecetaMedica.interface";
import { MedicoRepository } from "../../repository/RecetaMedica/Medico.repository";
import { RecetaArticuloRepository } from "../../repository/RecetaMedica/RecetaArticulo.repository";
import { DetalleLookupInfo, DetalleLookupMap } from "../Venta/Venta.service";

type CreateFromVentaArgs = {
  id_venta: string;
  recetaPayload: IRecetaDesdeVenta;
  tempToDetalle: DetalleLookupMap;
};

type Options = { transaction?: Transaction };

export const RecetaMedicaService = {

  getAll: async () => {
    return await RecetaMedicaRepository.getAll();
  },

  createFromVenta: async (
    args: CreateFromVentaArgs,
    options?: Options
  ) => {
    const run = async (t: Transaction) => {
      if (!args?.id_venta) throw new Error("Falta id_venta.");
      if (!args?.recetaPayload) throw new Error("Falta recetaPayload.");
      if (!args?.tempToDetalle) throw new Error("Falta mapa tempToDetalleId.");
      
      
      const { receta, articulos } = args.recetaPayload;
      let { id_medico, medico_nuevo } = args.recetaPayload;
      


      if (!receta?.paciente_nombre || !receta?.fecha_expedicion) {
        throw new Error("Receta incompleta: paciente_nombre y fecha_expedicion son obligatorios.");
      }
      if (!Array.isArray(articulos) || articulos.length === 0) {
        throw new Error("La receta requiere al menos un artículo.");
      }

      // normaliza id_medico (evita "")
      const idMedico = id_medico && id_medico.trim() ? id_medico.trim() : undefined;


      if (!idMedico && !medico_nuevo && receta?.cedula_profesional) {
        const ced = String(receta.cedula_profesional).trim();     // <- del input "Cédula"
        const nombre = String(receta.nombre_completo ?? "").trim(); // <- del input "Nombre Médico"
        if (!nombre) throw new Error(`Médico no resuelto: falta nombre_completo para la cédula ${ced}`);

        medico_nuevo = {
          nombre_completo: nombre,
          cedula_profesional: ced,
          especialidad: (receta as any).especialidad ?? null, // del <select>
          telefono: (receta as any).telefono ?? null,
          correo: (receta as any).correo ?? null,
          direccion: (receta as any).direccion ?? null,
        };
      }

      // resolver id del médico (busca por cédula y crea si no existe)
      const id_medico_resuelto = await MedicoRepository.resolveOrCreate(t, {
        id_medico: idMedico,
        medico_nuevo,
      });

      const recetaCreada = await RecetaMedicaRepository.create(t, {
        id_venta: args.id_venta,
        id_medico: id_medico_resuelto,
        data:{
          paciente_nombre: receta.paciente_nombre,
          paciente_direccion: receta.paciente_direccion ?? null,
          fecha_expedicion: receta.fecha_expedicion,
          folio: receta.folio ?? null,
          fuente: receta.fuente ?? null,
          creada_por_usuario: receta.creada_por_usuario,
        },
    });

      const rows = articulos.map(a => {
       const key = String(a.temp_line_id);
        const info = args.tempToDetalle.get(key);
        if (!info) {
          throw new Error(`No se pudo mapear temp_line_id=${a.temp_line_id} a un detalle_venta.`);
        }
        return {
          id_detalle_venta: info.id_detalle_venta,
          id_articulo: info.id_articulo,
          indicaciones: a.indicaciones ?? null,
          cantidad_prescrita: a.cantidad_prescrita ?? null,
          dosis: a.dosis ?? null,
          sustitucion_permitida: a.sustitucion_permitida ?? null,

         };
      });

      await RecetaArticuloRepository.agregarArticulosAReceta(t, {
        id_receta: recetaCreada.id_receta,
        recetaArticulos: rows,
      });

      return recetaCreada;
    };

    if (options?.transaction) {
      return run(options.transaction);
    }
    return dbLocal.transaction(run);
  },
};



