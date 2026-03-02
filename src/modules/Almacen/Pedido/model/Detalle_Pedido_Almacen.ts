// models/Detalle_Pedido_Almacen.ts
import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index
} from 'sequelize-typescript';
import Pedido_Almacen from './Pedido_Almacen';
import Detalle_Pedido_Almacen_Asignacion from './Detalle_Pedido_Almacen_Asignacion';
import Detalle_Pedido_Almacen_Lote from './Detalle_Pedido_Almacen_Lote';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

@Table({
  tableName: 'detalle_pedido_almacen',
  timestamps: false
})

export default class Detalle_Pedido_Almacen extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id_detalle_pedido_almacen: string;

  @Column(DataType.INTEGER)
  declare orden_detalle: number;

  @ForeignKey(() => Pedido_Almacen)
  @Index('ix_detalle_pedido')
  @Column(DataType.UUID)
  declare id_pedido_almacen: string;


  @ForeignKey(() => Articulo)
  @Index('ix_detalle_articulo')
  @Column(DataType.UUID)
  declare id_articulo: string;
  @BelongsTo(() => Articulo)
  articulo: Articulo;

  @Column(DataType.SMALLINT)
  declare cant_pedida: number;

  @Column(DataType.DECIMAL(12, 2))
  declare precio_venta: number;

  @Column(DataType.BOOLEAN)
  declare es_oferta: boolean;

  @BelongsTo(() => Pedido_Almacen)
  declare pedido?: Pedido_Almacen;

  @HasMany(() => Detalle_Pedido_Almacen_Asignacion)
  declare asignaciones?: Detalle_Pedido_Almacen_Asignacion[];

  @HasMany(() => Detalle_Pedido_Almacen_Lote)
  declare lotes?: Detalle_Pedido_Almacen_Lote[];



}