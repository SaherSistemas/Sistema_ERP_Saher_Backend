import { IPresupuesto_AgenteCreate, IPresupuesto_Agente_Movimiento } from '../interface/Presupuesto_Agente.interface';
import { PresupuestoAgenteRepository } from '../repositories/Presupuesto_Agente.respository';
import { AgenteRepository } from '../repositories/Agente.repository';
import { Comision_Regla_AgenteRepository } from '../repositories/Comision_Regla_Agente.repository';

export const PresupuestoAgenteService = {

  // ==========================================
  // Crear presupuesto
  // ==========================================
  create: async (data: IPresupuesto_AgenteCreate) => {
    const activo = await PresupuestoAgenteRepository.getActivo(data.id_agente);
    if (activo) {
      throw {
        status: 400,
        message: `El agente ya tiene un presupuesto activo del mes ${activo.mes}/${activo.anio}.`
      };
    }
    return await PresupuestoAgenteRepository.create(data);
  },

  // ==========================================
  // Obtener presupuesto activo
  // ==========================================
  getActivo: async (id_agente: string) => {
    return await PresupuestoAgenteRepository.getActivo(id_agente);
  },

  // ==========================================
  // Resumen completo de un presupuesto
  // (monto asignado + vendido real + ajustes + %)
  // ==========================================
  getResumen: async (id_presupuesto_agente: string) => {
    const resumen = await PresupuestoAgenteRepository.getResumen(id_presupuesto_agente);
    if (!resumen) throw { status: 404, message: 'Presupuesto no encontrado.' };
    return resumen;
  },

  // ==========================================
  // Registrar ajuste manual
  // ==========================================
  registrarAjuste: async (data: IPresupuesto_Agente_Movimiento) => {
    const presupuesto = await PresupuestoAgenteRepository.getActivo(data.id_presupuesto_agente as any);
    // getActivo recibe id_agente, así que usamos findByPk implícito vía repository
    return await PresupuestoAgenteRepository.registrarMovimiento(data);
  },

  // ==========================================
  // Cerrar mes actual de un agente
  // ==========================================
  cerrarMes: async (id_agente: string) => {
    const presupuesto = await PresupuestoAgenteRepository.getActivo(id_agente);
    if (!presupuesto) {
      throw { status: 404, message: 'No existe un presupuesto activo para este agente.' };
    }

    const movimientos = await PresupuestoAgenteRepository.getMovimientosByPresupuesto(
      presupuesto.id_presupuesto_agente
    );

    const monto_ajustes = movimientos.reduce((s, m) => s + Number(m.monto), 0);
    const monto_vendido = await PresupuestoAgenteRepository.getVendidoReal(
      id_agente, presupuesto.mes, presupuesto.anio
    );
    const monto_utilizado = monto_vendido + monto_ajustes;
    const monto_restante  = Math.max(Number(presupuesto.monto_asignado) - monto_utilizado, 0);
    const porcentaje = presupuesto.monto_asignado > 0
      ? (monto_utilizado / Number(presupuesto.monto_asignado)) * 100 : 0;

    await PresupuestoAgenteRepository.guardarHistorico({
      id_presupuesto_agente: presupuesto.id_presupuesto_agente,
      monto_asignado:        Number(presupuesto.monto_asignado),
      monto_utilizado,
      monto_restante,
      porcentaje_cumplimiento: porcentaje,
      fecha_cierre: new Date()
    });

    await PresupuestoAgenteRepository.cerrarPresupuesto(presupuesto.id_presupuesto_agente, {
      ...presupuesto.toJSON(),
      estatus: 'CERRADO',
      fecha_fin: new Date()
    } as any);

    return {
      message: 'Presupuesto cerrado correctamente.',
      cierre: { monto_asignado: presupuesto.monto_asignado, monto_vendido, monto_ajustes, monto_utilizado, monto_restante, porcentaje }
    };
  },

  // ==========================================
  // Histórico de un agente
  // ==========================================
  getHistorico: async (id_agente: string) => {
    const historial = await PresupuestoAgenteRepository.getHistoricoByAgente(id_agente);
    if (!historial || historial.length === 0) {
      throw { status: 404, message: 'El agente no tiene historial de presupuestos.' };
    }
    return historial;
  },

  // ==========================================
  // Todos los presupuestos
  // ==========================================
  getAll: async () => PresupuestoAgenteRepository.getAllPresupuestos(),

  getActivos: async () => PresupuestoAgenteRepository.getPresupuestosActivos(),

  getMovimientos: async (id_presupuesto_agente: string) =>
    PresupuestoAgenteRepository.getMovimientos(id_presupuesto_agente),

  // ==========================================
  // MI RESUMEN — para el agente logueado
  // Recibe id_empleado del JWT, resuelve su agente y devuelve
  // presupuesto activo + avance vendido + regla/estimado de comisión.
  // ==========================================
  getMiResumen: async (id_empleado: string) => {
    // 1. Resolver agente
    const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
    if (!agente) throw { status: 404, message: 'No se encontró un agente de venta asociado a este usuario.' };

    // 2. Presupuesto activo
    const presupuesto = await PresupuestoAgenteRepository.getActivo(agente.id_agente);
    if (!presupuesto) {
      return { sin_presupuesto: true, agente: { id_agente: agente.id_agente } };
    }

    // 3. Resumen de ventas vs presupuesto
    const resumen = await PresupuestoAgenteRepository.getResumen(presupuesto.id_presupuesto_agente);

    // 4. Regla de comisión base
    const reglas       = await Comision_Regla_AgenteRepository.getByAgente(agente.id_agente);
    const reglaBase    = reglas.find((r: any) => !r.id_cliente_alm);
    const comision_regla: any = reglaBase?.regla_json ?? { tipo: 'anticipado', pct: 5 };

    // 5. Estimado de comisión (sobre lo vendido este mes)
    let comision_estimada = 0;
    const vendido = resumen?.monto_vendido ?? 0;
    if (comision_regla.tipo === 'fijo' || comision_regla.tipo === 'anticipado') {
      comision_estimada = vendido * ((comision_regla.pct ?? 0) / 100);
    } else if (comision_regla.tipo === 'escalonado' && Array.isArray(comision_regla.tramos)) {
      // Aplicar tramo más alto alcanzado (simplificado: toma el pct del último tramo cubierto)
      const tramosOrdenados = [...comision_regla.tramos].sort((a: any, b: any) => a.dias_max - b.dias_max);
      const pct = tramosOrdenados[tramosOrdenados.length - 1]?.pct ?? 0;
      comision_estimada = vendido * (pct / 100);
    }

    return {
      sin_presupuesto: false,
      presupuesto: {
        mes:            presupuesto.mes,
        anio:           presupuesto.anio,
        monto_asignado: resumen?.monto_asignado ?? 0,
        estatus:        presupuesto.estatus,
      },
      monto_vendido:      resumen?.monto_vendido    ?? 0,
      monto_ajustes:      resumen?.monto_ajustes    ?? 0,
      monto_total:        resumen?.monto_total       ?? 0,
      porcentaje:         resumen?.porcentaje        ?? 0,
      comision_regla,
      comision_estimada:  Math.round(comision_estimada * 100) / 100,
    };
  },

  // ==========================================
  // Tablero general con avance real por agente
  // ==========================================
  getTablero: async (mes?: number, anio?: number) =>
    PresupuestoAgenteRepository.getTablero(mes, anio),

  // ==========================================
  // MI HISTÓRICO — para el agente logueado
  // Resuelve id_agente del JWT y devuelve sus
  // presupuestos cerrados ordenados por fecha.
  // Devuelve [] si aún no hay cierres (no lanza 404).
  // ==========================================
  getMiHistorico: async (id_empleado: string) => {
    const agente = await AgenteRepository.getByIdEmpleado(id_empleado);
    if (!agente) throw { status: 404, message: 'No se encontró un agente de venta asociado a este usuario.' };

    const historial = await PresupuestoAgenteRepository.getHistoricoByAgente(agente.id_agente);
    return historial ?? [];
  },
};
