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
  HasMany
} from 'sequelize-typescript';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import LotesRecibidosCompra from '../../../../models/LotesYCaducidad/LotesRecibidosCompra';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Detalle_Pedido_Almacen_Lote from '../../../Almacen/Pedido/model/Detalle_Pedido_Almacen_Lote';

@Table({
  tableName: 'lote_articulo_sucursal'
})
class Lote_Articulo_Sucursal extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID
  })
  declare id_lote_sucursal: string;

  @ForeignKey(() => Articulo)
  @Column({
    type: DataType.UUID
  })
  declare id_artic: string;
  @BelongsTo(() => Articulo)
  declare articulo: Articulo;

  @ForeignKey(() => Empresa_Sucursal)
  @Column({
    type: DataType.UUID
  })
  declare id_empre: string;
  @BelongsTo(() => Empresa_Sucursal)
  declare empresa: Empresa_Sucursal;

  @Column({
    type: DataType.STRING(50)
  })
  declare numero_lote_sucursal: string;

  @Column({
    type: DataType.DATE
  })
  declare fecha_venci_lote_sucursal: Date;

  @Column({
    type: DataType.INTEGER
  })
  declare cantidad_entrada_lote: number;

  @Default(0)
  @Column({
    type: DataType.INTEGER
  })
  declare cantidad_apartada_lote: number;

  //CAMPO PARA SABER DE QUE LOTE FUE RECIBIDO
  @ForeignKey(() => LotesRecibidosCompra)
  @Column({
    type: DataType.UUID
  })
  declare id_loterecibido_lote_sucursal: string;

  //NUEVO CAMPO PARA COSTO DEL LOTE
  @Column({
    type: DataType.DECIMAL(10, 2)
  })
  declare precio_costo_lote_sucursal: number;

  @Column({
    type: DataType.CHAR(1)
  })
  declare estado_lote_sucursal: string;


  @HasMany(() => Detalle_Pedido_Almacen_Lote, {
    foreignKey: 'id_lote_sucursal',
    as: 'lote_pedido'
  })
  declare lote_pedido?: Detalle_Pedido_Almacen_Lote[];
}

export default Lote_Articulo_Sucursal;
