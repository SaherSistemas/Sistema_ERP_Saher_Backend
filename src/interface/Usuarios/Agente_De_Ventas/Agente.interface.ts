export interface IAgente_de_Venta {
  id_agente: string;
  id_empleado: string;
  cod_identi_agente: string;
  fecha_alta_agente: Date | null;
  fecha_baja_agente: Date | null;
  comision_agente: number;
  estatus_agente: boolean;
}

export interface IAgenteDeVentaCreate {
  id_empleado: string;
  cod_identi_agente: string;
  comision_agente: number;
}
