export interface IAgente_de_Venta {
  id_agente: string;
  id_empleado: string;
  cod_identi_agente: string;
  fecha_alta_agente: Date | null;
  fecha_baja_agente: Date | null;
  estatus_agente: boolean;
}

export interface IAgenteDeVentaCreate {
  id_empleado: string;
  cod_identi_agente: string;
  id_bodega_local: string;
}
