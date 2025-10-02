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
  HasMany,
} from "sequelize-typescript";
import RecetaMedica from "./RecetaMedica";


@Table({
  tableName: "medico",
})
class Medico extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_medico: string; 

  @Column({
    type: DataType.STRING,
  })
  declare nombre_completo: string;  

  @Unique("uk_medico_cedula")
  @Column({
    type: DataType.STRING(15),
    allowNull: false
  })
  declare cedula_profesional: string; 

 @Column({
    type: DataType.STRING,
  })
  declare especialidad?: string | null;    

  @Column({
    type: DataType.STRING(10),
  })
  declare telefono?: string | null;   

  @Column({
    type: DataType.STRING,
  })
  declare correo?: string | null;      

  @Column({
    type: DataType.STRING,
  })
  declare direccion?: string | null;  

  @Column({
    type: DataType.BOOLEAN,
  })
  declare activo: boolean;       

  @HasMany(() => RecetaMedica)
  recetas!: RecetaMedica[];
}

export default Medico;



    