import { Table, Column, Model, PrimaryKey, ForeignKey, DataType, BelongsTo, Default } from 'sequelize-typescript';

import Pedido_Almacen from './Pedido_Almacen';
import Articulo from '../Articulos/Articulo';

@Table({
  tableName: 'detalle_pedido_almacen',
  timestamps: false
})
class Detalle_Pedido_Almacen extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id_detalle_pedido_almacen: string;

  @ForeignKey(() => Pedido_Almacen)
  @Column(DataType.UUID)
  declare id_pedido_almacen: string;

  @ForeignKey(() => Articulo)
  @Column(DataType.UUID)
  declare id_articulo: string;

  @Column(DataType.SMALLINT)
  declare cant_pedida: number;

  @Column(DataType.SMALLINT)
  declare cantidad_surtida: number;

  @Column(DataType.SMALLINT)
  declare cantidad_checada: number;

  @Column(DataType.DECIMAL(12, 2))
  declare precio_venta: number;

  @Column(DataType.BOOLEAN)
  declare es_oferta: boolean;

  @BelongsTo(() => Articulo)
  articulo: Articulo;

  @BelongsTo(() => Pedido_Almacen)
  pedido: Pedido_Almacen;
}

export default Detalle_Pedido_Almacen;
