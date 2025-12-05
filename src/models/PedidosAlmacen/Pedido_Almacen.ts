import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo } from 'sequelize-typescript';

import Cliente_Almacen from '../Clientes/Cliente_Almacen/Cliente_Almacen';
import Cat_Tipo_Pedido_Almacen from '../Catalogos/Pedidos_Almacen/Cat_Tipo_Pedido_Almacen';
import Cat_Status_Pedido_Almacen from '../Catalogos/Pedidos_Almacen/Cat_Status_Pedido_Almacen';
import Agente_de_Venta from '../Usuarios/Agente_De_Ventas/Agente_De_Venta';

@Table({
  tableName: 'pedido_almacen'
})
class Pedido_Almacen extends Model {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id_pedido_alm: string;

  @Unique
  @Column(DataType.STRING(40))
  declare cod_int_pedido_alm: string;

  @Column(DataType.DATEONLY)
  declare fecha_facturado_pedido_alm: Date;

  @ForeignKey(() => Cat_Status_Pedido_Almacen)
  @Column(DataType.CHAR(2))
  declare status_pedido_alm: string;

  @BelongsTo(() => Cat_Status_Pedido_Almacen)
  status: Cat_Status_Pedido_Almacen;

  @Column(DataType.DATE)
  declare fecha_entrega_alm: Date;

  @Column(DataType.DATE)
  declare fecha_max_entrega_alm: Date;

  @ForeignKey(() => Cat_Tipo_Pedido_Almacen)
  @Column(DataType.CHAR(4))
  declare tipo_pedido_alm: string;

  @BelongsTo(() => Cat_Tipo_Pedido_Almacen)
  tipo_pedido: Cat_Tipo_Pedido_Almacen;

  @Column(DataType.DATE)
  declare entrega_al_cliente: Date;

  @ForeignKey(() => Cliente_Almacen)
  @Column(DataType.UUID)
  declare id_cliente_pedido_alm: string;

  @BelongsTo(() => Cliente_Almacen)
  cliente: Cliente_Almacen;

  @ForeignKey(() => Agente_de_Venta)
  @Column(DataType.UUID)
  declare id_agente_pedido_alm: string;

  @BelongsTo(() => Agente_de_Venta)
  agente: Agente_de_Venta;
}

export default Pedido_Almacen;
