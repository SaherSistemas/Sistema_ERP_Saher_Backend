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
  AllowNull,
  Index,
  CreatedAt,
  UpdatedAt,
  HasMany
} from 'sequelize-typescript';

import Empleado from '../../../RRHH/model/Empleado';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';
import { Bulto_Pedido } from './Bulto_Pedido';
@Table({
  tableName: 'pedido_almacen_empaque',
})
class Pedido_Almacen_Empaque extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id_pedido_empaque: string;

  @ForeignKey(() => Pedido_Almacen)
  @Unique
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare id_pedido_almacen: string;

  @BelongsTo(() => Pedido_Almacen)
  declare pedido: Pedido_Almacen;

  @ForeignKey(() => Empleado)
  @AllowNull(false)
  @Index
  @Column(DataType.UUID)
  declare id_empleado_empaco: string;

  @BelongsTo(() => Empleado)
  declare empleado_empaco: Empleado;

  @AllowNull(false)
  @Default('EN_PROCESO')
  @Index
  @Column(DataType.ENUM('EN_PROCESO', 'EMPACADO', 'FINALIZADO'))
  declare estado: | 'EN_PROCESO' | 'EMPACADO' | 'CANCELADO';

  @AllowNull(true)
  @Column(DataType.DATE)
  declare fecha_asignado: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare inicio: Date | null;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare fin: Date | null;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare cajas: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.SMALLINT)
  declare bolsas: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare nota: string | null;


  @HasMany(() => Bulto_Pedido, { foreignKey: 'id_pedido_empaque', as: 'bultos' })
  declare bultos?: Bulto_Pedido[];

}

export default Pedido_Almacen_Empaque;