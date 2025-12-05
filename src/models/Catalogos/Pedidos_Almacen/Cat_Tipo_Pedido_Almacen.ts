import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_tipo_pedido_almacen' })
class Cat_Tipo_Pedido_Almacen extends Model {
  @PrimaryKey
  @Column(DataType.STRING(3))
  declare id_tipo_pedido_almacen: string;

  @Column(DataType.STRING(150))
  declare descripcion: string;

  @Column(DataType.BOOLEAN)
  declare activo: boolean;
}

export default Cat_Tipo_Pedido_Almacen;
