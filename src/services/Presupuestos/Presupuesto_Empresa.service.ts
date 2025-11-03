import { ICreateOrUpdatePresupuesto_Empresa } from "../../interface/Presupuestos/Presupuesto_Empresa.interface";
import { Presupuesto_EmpresaRepository } from "../../repository/Presupuestos/Presupuesto_Empresa.repository";

export const Presupuesto_EmpresaService = {
  getAll: async () => {
    return await Presupuesto_EmpresaRepository.getAll();
  },
  create: async (data: ICreateOrUpdatePresupuesto_Empresa) => {
    const { monto_total, turnos_planeados } = data;

    const monto_por_turno =
      turnos_planeados > 0 ? monto_total / turnos_planeados : 0;

    return await Presupuesto_EmpresaRepository.create({
      ...data,
      monto_por_turno,
    });
  },

  getPresupuestoById: async (id_presupuesto: string) => {
    const presupuesto = await Presupuesto_EmpresaRepository.getByID(
      id_presupuesto
    );
    if (!presupuesto) throw new Error("Presupuesto no encontrado.");
    return presupuesto;
  },

  BuscarPresupuestos: async (terminoBusqueda: string) => {
    if (!terminoBusqueda) throw new Error("Debe indicar un valor de búsqueda.");
    return await Presupuesto_EmpresaRepository.getByIDFlexible(terminoBusqueda);
  },

  getPresupuestosEmpresa: async (id_empre: string) => {
    if (!id_empre) throw new Error("Debe indicar una empresa válida.");
    return await Presupuesto_EmpresaRepository.getAllEmpresa(id_empre);
  },

  cerrarPresupuesto: async (id_presupuesto: string) => {
    const presupuesto = await Presupuesto_EmpresaRepository.getByID(
      id_presupuesto
    );
    if (!presupuesto) throw new Error("Presupuesto no encontrado.");
    if (presupuesto.estado_presupuesto === "CERRADO")
      throw new Error("El presupuesto ya está cerrado.");

    await presupuesto.update({ estado_presupuesto: "CERRADO" });
    return presupuesto;
  },

  buscarPorFecha: async (filtros: { anio?: number; mes?: number }) => {
    const { anio, mes } = filtros;

    if (!anio && !mes) {
      throw new Error("Debe proporcionar al menos un año o mes para filtrar.");
    }

    const presupuestos = await Presupuesto_EmpresaRepository.findByFecha({
      ...(anio && { anio }),
      ...(mes && { mes }),
    });

    return presupuestos;
  },

  updatePresupuesto: async (
    id_presupuesto: string,
    data: ICreateOrUpdatePresupuesto_Empresa
  ) => {
    const presupuesto = await Presupuesto_EmpresaRepository.getByID(
      id_presupuesto
    );
    if (!presupuesto) throw new Error("Presupuesto no encontrado.");

    if (presupuesto.estado_presupuesto !== "PLANIFICADO") {
      throw new Error(
        "Solo se puede modificar un presupuesto en estado PLANIFICADO."
      );
    }

    const monto_total = data.monto_total ?? presupuesto.monto_total;
    const turnos_planeados =
      data.turnos_planeados ?? presupuesto.turnos_planeados;

    if (turnos_planeados && turnos_planeados > 0) {
      data.monto_por_turno = Number(monto_total) / turnos_planeados;
    }

    return await Presupuesto_EmpresaRepository.update(id_presupuesto, data);
  },

  getPresupuestosVigentes: async (id_empre: string) => {
    return await Presupuesto_EmpresaRepository.getAllPresupuestoVigenteEmpresa(id_empre);
  },
};
