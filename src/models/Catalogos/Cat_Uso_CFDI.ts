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
  tableName: 'cat_uso_cfdi'
})
class Cat_uso_CFDI extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING(5)
  })
  declare id_uso_cfdi: string;

  @Column({
    type: DataType.STRING(150)
  })
  declare descripcion_uso_cfdi: string;

  @Column({
    type: DataType.STRING(200)
  })
  declare regimen_fiscal_permitido: string;
}
export default Cat_uso_CFDI;
