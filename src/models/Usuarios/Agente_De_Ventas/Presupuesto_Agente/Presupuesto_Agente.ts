import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Agente_De_Ventas from '../Agente_De_Venta';

@Table({
  tableName: 'presupuesto_agente'
})
class Presupuesto_Agente extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID })
  declare id_presupuesto_agente: string;

  @ForeignKey(() => Agente_De_Ventas)
  @Column({ type: DataType.UUID })
  declare id_agente: string;

  @Column(DataType.SMALLINT)
  declare anio: number;

  @Column(DataType.SMALLINT)
  declare mes: number;

  @Column(DataType.DATE)
  declare fecha_inicio: Date;

  @Column(DataType.DATE)
  declare fecha_fin: Date;

  @Column(DataType.DECIMAL(12, 2))
  declare monto_asignado: number;

  @Default('ABIERTO')
  @Column(DataType.STRING(15))
  declare estatus: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare llego_meta: boolean;
  @BelongsTo(() => Agente_De_Ventas)
  agente: Agente_De_Ventas;
}

export default Presupuesto_Agente;
