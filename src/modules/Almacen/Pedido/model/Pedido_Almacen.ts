import {
  Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique,
  BelongsTo, HasMany, Default, AllowNull, Index, CreatedAt, UpdatedAt
} from 'sequelize-typescript';

import Cat_Status_Pedido_Almacen from './Cat_Status_Pedido_Almacen';
import Cat_Tipo_Pedido_Almacen from './Cat_Tipo_Pedido_Almacen';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Usuario from '../../../Seguridad/model/Usuario';
import Empleado from '../../../RRHH/model/Empleado';
import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';
// import Usuario from '../../../Usuarios/model/Usuario'; // AJUSTA RUTA/MODELO SI EXISTE

@Table({
  tableName: 'pedido_almacen',
})
class Pedido_Almacen extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id_pedido_alm: string;

  @Unique
  @Column(DataType.STRING(40))
  declare cod_int_pedido_alm: string;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare fecha_facturado_pedido_alm: Date | null;

  @ForeignKey(() => Cat_Status_Pedido_Almacen)
  @Index
  @Column(DataType.CHAR(2))
  declare status_pedido_alm: string;

  @BelongsTo(() => Cat_Status_Pedido_Almacen)
  declare status: Cat_Status_Pedido_Almacen;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare fecha_entrega_alm: Date | null;

  @AllowNull(true)
  @Index
  @Column(DataType.DATE)
  declare fecha_max_entrega_alm: Date | null;

  @ForeignKey(() => Cat_Tipo_Pedido_Almacen)
  @Index
  @Column(DataType.CHAR(4))
  declare tipo_pedido_alm: string;

  @BelongsTo(() => Cat_Tipo_Pedido_Almacen)
  declare tipo_pedido: Cat_Tipo_Pedido_Almacen;

  @AllowNull(true)
  @Column(DataType.DATE)
  declare fecha_entrega_al_cliente: Date | null;

  @ForeignKey(() => Cliente_Almacen)
  @Index
  @Column(DataType.UUID)
  declare id_cliente_pedido_alm: string;

  @BelongsTo(() => Cliente_Almacen)
  declare cliente: Cliente_Almacen;

  @ForeignKey(() => Agente_de_Venta)
  @Index
  @Column(DataType.UUID)
  declare id_agente_pedido_alm: string;

  @BelongsTo(() => Agente_de_Venta)
  declare agente: Agente_de_Venta;

  @Default(null)
  @Column(DataType.DATE)
  declare inicio_surtido: Date | null;

  // ── Vales de empleado ────────────────────────────────────────────────────
  // 'PED' = pedido normal  |  'VALE' = vale de medicamento a empleado
  @Default('PED')
  @AllowNull(false)
  @Column(DataType.STRING(4))
  declare origen_pedido: string;

  @AllowNull(true)
  @ForeignKey(() => Empleado)
  @Column(DataType.UUID)
  declare id_empleado_vale: string | null;

  @BelongsTo(() => Empleado)
  declare empleado_vale: Empleado;

  @HasMany(() => Detalle_Pedido_Almacen, { foreignKey: 'id_pedido_almacen' })
  declare detalle_pedido_almacens?: Detalle_Pedido_Almacen[];
}

export default Pedido_Almacen;