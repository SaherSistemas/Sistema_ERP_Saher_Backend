import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_status_pedido_almacen' })
class Cat_Status_Pedido_Almacen extends Model {
  @PrimaryKey
  @Column(DataType.STRING(3))
  declare id_status_pedido_almacen: string;

  @Column(DataType.STRING(150))
  declare descrip_almacen: string;

  @Column(DataType.SMALLINT)
  declare orden: number;

  @Column(DataType.BOOLEAN)
  declare activo: boolean;
}

export default Cat_Status_Pedido_Almacen;
