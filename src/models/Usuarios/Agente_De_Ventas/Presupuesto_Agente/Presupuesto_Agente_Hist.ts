import { Table, Column, Model, DataType, PrimaryKey, ForeignKey } from 'sequelize-typescript';
import Presupuesto_Agente from './Presupuesto_Agente';

@Table({
  tableName: 'presupuesto_agente_historico'
})
class Presupuesto_Agente_Hist extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id_historial_presupuesto_agente: string;

  @ForeignKey(() => Presupuesto_Agente)
  @Column(DataType.UUID)
  declare id_presupuesto_agente: string;

  @Column(DataType.DECIMAL(12, 2))
  declare monto_asignado: number;

  @Column(DataType.DECIMAL(12, 2))
  declare monto_utilizado: number;

  @Column(DataType.DECIMAL(12, 2))
  declare monto_restante: number;

  @Column(DataType.DECIMAL(5, 2))
  declare porcentaje_cumplimiento: number;

  @Column(DataType.DATE)
  declare fecha_cierre: Date;
}

export default Presupuesto_Agente_Hist;
