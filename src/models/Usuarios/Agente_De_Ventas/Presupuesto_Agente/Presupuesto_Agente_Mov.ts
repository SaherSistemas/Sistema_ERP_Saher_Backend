import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Presupuesto_Agente from './Presupuesto_Agente';

@Table({
  tableName: 'presupuesto_agente_mov'
})
class Presupuesto_Agente_Mov extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id_movimiento_presupuesto_agente: string;

  @ForeignKey(() => Presupuesto_Agente)
  @Column(DataType.UUID)
  declare id_presupuesto_agente: string;

  @Column(DataType.STRING(20))
  declare tipo_movimiento: string;

  @Column(DataType.DECIMAL(12, 2))
  declare monto: number;

  @Column(DataType.DECIMAL(12, 2))
  declare saldo_anterior: number;

  @Column(DataType.DECIMAL(12, 2))
  declare saldo_nuevo: number;

  @Column(DataType.DATE)
  declare fecha: Date;

  @Column(DataType.UUID)
  declare id_usuario: string;

  @Column(DataType.TEXT)
  declare comentario: string;


}

export default Presupuesto_Agente_Mov;
