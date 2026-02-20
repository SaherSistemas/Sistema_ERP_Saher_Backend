export interface IPresupuesto_AgenteCreate {
  id_agente: string;
  anio: number;
  mes: number;
  monto_asignado: number;
}

export interface IPresupuesto_Agente extends IPresupuesto_AgenteCreate {
  id_presupuesto_agente: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  monto_asignado: number;
  estatus: 'ABIERTO' | 'CERRADO';
  createdAt: Date;
  updatedAT: Date;
}

export interface IPresupuesto_Agente_Movimiento {
  id_moviento_presupuesto_agente: string;
  id_presupuesto_agente: string;
  tipo_movimiento: 'venta' | 'ajuste'; //VENTA (-) Ó AJUSTE (+)
  monto: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  fecha: number;
  id_usuario: string;
  comentario: string;
}

export interface IPresupuesto_Agente_Historico {
  id_historial_presupuesto_agente: string;
  id_presupuesto_agente: string;
  monto_asignado: number;
  monto_utilizado: number;
  monto_restante: number;
  porcentaje_cumplimiento: number;
  fecha_cierre: Date;
}
