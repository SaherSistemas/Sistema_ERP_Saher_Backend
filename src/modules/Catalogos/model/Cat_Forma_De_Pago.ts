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
  tableName: 'cat_forma_de_pago'
})
class Cat_Forma_De_Pago extends Model {
  @PrimaryKey
  @Column({
    type: DataType.CHAR(2)
  })
  declare id_forma_de_pago: string;

  @Column({
    type: DataType.STRING(150)
  })
  declare descripcion_forma_de_pago: string;

  @Column({
    type: DataType.BOOLEAN
  })
  declare es_fisico: boolean;

  @Column({
    type: DataType.BOOLEAN
  })
  declare status_metodo_pago: string;
}
export default Cat_Forma_De_Pago;
