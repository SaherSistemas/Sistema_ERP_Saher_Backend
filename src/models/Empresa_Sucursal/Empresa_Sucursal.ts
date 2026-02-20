import {
  Table,
  Column,
  DataType,
  Model,
  PrimaryKey,
  ForeignKey,
  Unique,
  BelongsTo,
  HasMany,
  Default,
} from "sequelize-typescript";
import Colonia from "../Ubicacion/Colonia";
import Grupo_Empresa from "./Grupo_Empresa";
import ListaPrecio from "../../modules/Comercial/Precios/model/Lista_Precio";
import Presupuesto_Empresa from "../Presupuestos/Presupuesto_Empresa";
import Movimiento_Presupuesto from "../Presupuestos/Movimiento_Presupuesto";
import Asignacion_Empleado_Sucursal from "../Presupuestos/Asignacion_Empleado_Sucursal";
import Caja from "../Caja/Caja";

@Table({
  tableName: "empresa_sucursal",
})
class Empresa_Sucursal extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_empre: string;

  @Column({
    type: DataType.STRING(100),
  })
  declare nom_empre: string;

  @Column({
    type: DataType.STRING(20),
  })
  declare rfc_empre: string;

  @Column({
    type: DataType.STRING(1),
    allowNull: false,
    defaultValue: "S",
  })
  declare tipo_empre: string;

  @Column({
    type: DataType.STRING(50),
  })
  declare calle_empre: string;

  @ForeignKey(() => Colonia)
  @Column({
    type: DataType.UUID,
  })
  declare id_colonia_empre: string;

  @Column({
    type: DataType.STRING(100),
  })
  declare correo_empre: string;

  @Column({
    type: DataType.STRING(20),
  })
  declare tele_empre: string;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
  })
  declare status_empre: boolean;

  @ForeignKey(() => Grupo_Empresa)
  @Column({
    type: DataType.UUID,
  })
  declare idgrup_empre: string;

  @ForeignKey(() => ListaPrecio)
  @Column({
    type: DataType.UUID,
  })
  declare id_listapreciodefault: string;

  @Column({
    type: DataType.BOOLEAN
  })
  declare es_empresa_principal: boolean
  @BelongsTo(() => ListaPrecio)
  listaPrecio: ListaPrecio;

  @BelongsTo(() => Grupo_Empresa)
  grupo: Grupo_Empresa;

  @BelongsTo(() => Colonia)
  colonia: Colonia;

  @HasMany(() => Presupuesto_Empresa)
  declare presupuestos?: Presupuesto_Empresa[];

  @HasMany(() => Movimiento_Presupuesto)
  declare movimiento_presupuesto?: Movimiento_Presupuesto[];

  @HasMany(() => Asignacion_Empleado_Sucursal)
  declare asignaciones?: Asignacion_Empleado_Sucursal[];

  @HasMany(() => Caja)
  declare cajas?: Caja[];


}

export default Empresa_Sucursal;
