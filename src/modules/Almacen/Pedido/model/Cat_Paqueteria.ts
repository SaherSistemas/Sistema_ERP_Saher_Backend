import { Table, Column, Model, PrimaryKey, DataType, Default, AllowNull } from 'sequelize-typescript';

@Table({ tableName: 'cat_paqueteria' })
class Cat_Paqueteria extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id_paqueteria: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  declare nombre_paqueteria: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare activo: boolean;
}

export default Cat_Paqueteria;
