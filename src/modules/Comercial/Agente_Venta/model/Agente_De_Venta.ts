import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  Unique,
  BelongsTo,
  Default,
  HasOne,
  HasMany,
  AllowNull
} from 'sequelize-typescript';
import Empleado from '../../../RRHH/model/Empleado';
import Presupuesto_Agente from './Presupuesto_Agente';
import { UUID } from 'crypto';

@Table({
  tableName: 'agente_de_venta'
})
class Agente_de_Venta extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID
  })
  declare id_agente: string;

  @ForeignKey(() => Empleado)
  @Column({
    type: DataType.UUID
  })
  declare id_empleado: string;

  @Unique
  @Column({
    type: DataType.STRING(4)
  })
  declare cod_identi_agente: string;

  @Column({
    type: DataType.DATE
  })
  declare fecha_alta_agente: Date;

  @Column({
    type: DataType.DATE
  })
  declare fecha_baja_agente: Date;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN
  })
  declare estatus_agente: boolean;

  @AllowNull(true)
  @Column({
    type: DataType.UUID
  })
  declare id_bodega_local: string | null;
  //BELONGS TO

  @BelongsTo(() => Empleado)
  declare empleado: Empleado;

  @HasMany(() => Presupuesto_Agente)
  presupuestos: Presupuesto_Agente[];
}
export default Agente_de_Venta;
