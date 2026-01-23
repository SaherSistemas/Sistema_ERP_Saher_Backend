export interface IReglaAgenteCreate {
  id_agente: string;
  dia_semana: number;
  hora_entrega_max: string;
  hora_recibo_max: string;
}

export interface IReglaAgente extends IReglaAgenteCreate {
  id_regla_agente: string;
  activa: boolean;
  createdAt: Date;
  updatedAt: Date;
}
