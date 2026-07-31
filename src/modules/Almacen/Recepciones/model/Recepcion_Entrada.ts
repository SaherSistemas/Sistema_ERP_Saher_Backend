import {
  Table, Column, Model, DataType, PrimaryKey,
  ForeignKey, BelongsTo
} from "sequelize-typescript";
import Empleado from "../../../RRHH/model/Empleado";
import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";

@Table({
  tableName: "recepcion_entrada",
})
export default class Recepcion_Entrada extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID })
  declare id_recepcion: string;

  @ForeignKey(() => Empresa_Sucursal)
  @Column({ type: DataType.UUID, allowNull: false })
  declare id_empresa: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare entidad_recibo: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  declare tipo_entidad: "PROVEEDOR" | "PAQUETERIA" | "MENSAJERIA" | "OTRO";

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare nombre_persona_entrega: string;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare cantidad_cajas: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare cantidad_bolsas: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare cantidad_tarimas: number;

  @Column({ type: DataType.TEXT })
  declare observaciones?: string;

  @Column({ type: DataType.STRING(300), allowNull: false })
  declare firma_url: string;

  @ForeignKey(() => Empleado)
  @Column({ type: DataType.UUID, allowNull: false })
  declare id_empleado_recibe: string;

  @BelongsTo(() => Empleado)
  declare empleado: Empleado;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  declare fecha_recepcion: Date;
}
