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
  BelongsToMany,
  HasMany,
} from "sequelize-typescript";
import Medico from "./Medico";
import Empleado from "../../modules/RRHH/model/Empleado";
import RecetaArticulo from "./Receta_Articulo";
import Venta from "../Venta/Venta";
import Articulo from "../../modules/Catalogos/Articulos/model/Articulo";

@Table({
  tableName: "receta_medica",
})
class RecetaMedica extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_receta: string;

  @ForeignKey(() => Venta)
  @Column({
    type: DataType.UUID,
  })
  declare id_venta: string;
  @BelongsTo(() => Venta)
  venta!: Venta;


  @ForeignKey(() => Medico)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare id_medico: string;
  @BelongsTo(() => Medico)
  medico!: Medico;


  @Column({
    type: DataType.STRING,
  })
  declare paciente_nombre: string;

  @Column({
    type: DataType.STRING,
  })
  declare paciente_direccion?: string | null;



  @Column({
    type: DataType.STRING,
  })
  declare fecha_expedicion: string;

  @Column({
    type: DataType.STRING,
  })
  declare folio?: string | null;

  @Column({
    type: DataType.STRING,
  })
  declare fuente?: "FISICA" | "DIGITAL" | null;


  // @Column({
  //   type: DataType.STRING,
  // })
  // declare archivo_ruta?: string | null;

  // @Column({
  //   type: DataType.STRING,
  // })
  // declare archivo_mime?: string | null;

  // @Column({
  //   type: DataType.STRING,
  // })
  // declare archivo_bytes?: number | null;

  @ForeignKey(() => Empleado)
  @Column({
    type: DataType.UUID,
  })
  declare id_empleado: string;
  @BelongsTo(() => Empleado)
  creadoPor!: Empleado;


  @BelongsToMany(() => Articulo, () => RecetaArticulo)
  articulos!: Array<Articulo & {
    ArticuloReceta: RecetaArticulo
  }>;


  @HasMany(() => RecetaArticulo, { foreignKey: 'id_receta', as: 'lineas' })
  lineas!: RecetaArticulo[];


}

export default RecetaMedica;
