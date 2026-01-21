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
  HasOne
} from 'sequelize-typescript';

@Table({
  tableName: 'cat_metodo_pago'
})
class Cat_Metodo_Pago extends Model {
  @PrimaryKey
  @Column({
    type: DataType.CHAR(3)
  })
  declare id_metodo_pago: string;

  @Column({
    type: DataType.STRING(150)
  })
  declare descripcion_metodo_pago: string;
}
export default Cat_Metodo_Pago;
