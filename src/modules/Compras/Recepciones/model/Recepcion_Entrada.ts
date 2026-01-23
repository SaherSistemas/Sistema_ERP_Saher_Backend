import {
  Table, Column, Model, DataType, PrimaryKey,
  ForeignKey
} from "sequelize-typescript";
import Empleado from "../../../RRHH/model/Empleado";

@Table({
  tableName: "recepcion_entrada",
})
export default class Recepcion_Entrada extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID })
  declare id_recepcion: string;

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

  @Column({ type: DataType.BLOB, allowNull: false }) // Postgres -> BYTEA
  declare firma_png: Buffer;

  @Column({ type: DataType.STRING(50), allowNull: false, defaultValue: "image/png" })
  declare firma_mime: string;

  @ForeignKey(() => Empleado)
  @Column({ type: DataType.UUID, allowNull: false })
  declare id_empleado_recibe: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  declare fecha_recepcion: Date;
}
