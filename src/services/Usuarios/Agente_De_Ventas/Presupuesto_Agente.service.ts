import { IPresupuesto_AgenteCreate } from '../../../interface/Usuarios/Agente_De_Ventas/Presupuestos_Agente/Presupuesto_Agente.interface';
import { PresupuestoAgenteRepository } from '../../../repository/Usuarios/Agente_De_Ventas/Presupuesto_Agente.respository';

export const PresupuestoAgenteService = {
  // ==========================================
  // Crear presupuesto
  // ==========================================
  create: async (data: IPresupuesto_AgenteCreate) => {
    // Validar si ya existe un presupuesto activo
    const activo = await PresupuestoAgenteRepository.getActivo(data.id_agente);

    if (activo) {
      throw {
        status: 400,
        message: `El agente ya tiene un presupuesto activo del mes ${activo.mes}/${activo.anio}.`
      };
    }

    // Crear uno nuevo
    return await PresupuestoAgenteRepository.create(data);
  },

  // ==========================================
  // Obtener presupuesto activo
  // ==========================================
  getActivo: async (id_agente: string) => {
    return await PresupuestoAgenteRepository.getActivo(id_agente);
  },

  // ==========================================
  // Cerrar mes actual de un agente
  // ==========================================
  cerrarMes: async (id_agente: string) => {
    const presupuesto = await PresupuestoAgenteRepository.getActivo(id_agente);

    if (!presupuesto) {
      throw { status: 404, message: 'No existe un presupuesto activo para este agente.' };
    }

    // ==========================================
    // TRAER TODOS LOS MOVIMIENTOS DEL MES
    // ==========================================
    const movimientos = await PresupuestoAgenteRepository.getMovimientosByPresupuesto(
      presupuesto.id_presupuesto_agente
    );

    let monto_utilizado = 0;
    let monto_restante = Number(presupuesto.monto_asignado);

    // ==========================================
    // CALCULAR UTILIZACIÓN Y SALDO FINAL
    // ==========================================
    for (const mov of movimientos) {
      if (mov.tipo_movimiento === 'venta') {
        monto_utilizado += mov.monto; // Venta RESTA
        monto_restante -= mov.monto;
      } else if (mov.tipo_movimiento === 'ajuste') {
        monto_restante += mov.monto; // Ajuste SUMA
      }
    }

    // Evitar negativos
    if (monto_restante < 0) monto_restante = 0;

    const porcentaje =
      presupuesto.monto_asignado > 0 ? (monto_utilizado / Number(presupuesto.monto_asignado)) * 100 : 0;

    // ==========================================
    // GUARDAR HISTÓRICO DEL CIERRE
    // ==========================================
    await PresupuestoAgenteRepository.guardarHistorico({
      id_presupuesto_agente: presupuesto.id_presupuesto_agente,
      monto_asignado: Number(presupuesto.monto_asignado),
      monto_utilizado,
      monto_restante,
      porcentaje_cumplimiento: porcentaje,
      fecha_cierre: new Date()
    });

    // ==========================================
    // CERRAR PRESUPUESTO ACTUAL
    // ==========================================
    await PresupuestoAgenteRepository.cerrarPresupuesto(presupuesto.id_presupuesto_agente, {
      ...presupuesto.toJSON(),
      estatus: 'CERRADO',
      fecha_fin: new Date()
    } as any);

    return {
      message: 'Presupuesto cerrado correctamente.',
      cierre: {
        monto_asignado: presupuesto.monto_asignado,
        monto_utilizado,
        monto_restante,
        porcentaje
      }
    };
  },

  // ==========================================
  // OBTENER HISTORICO POR AGENTE
  // ==========================================

  getHistorico: async (id_agente: string) => {
    const historial = await PresupuestoAgenteRepository.getHistoricoByAgente(id_agente);

    if (!historial || historial.length === 0) {
      throw { status: 404, message: 'El agente no tiene historial de presupuestos.' };
    }

    return historial;
  },
  getAll: async () => {
    return PresupuestoAgenteRepository.getAllPresupuestos();
  },

  getActivos: async () => {
    return PresupuestoAgenteRepository.getPresupuestosActivos();
  },

  getMovimientos: async (id_presupuesto_agente: string) => {
    return PresupuestoAgenteRepository.getMovimientos(id_presupuesto_agente);
  }
};
