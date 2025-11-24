import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  Default,
  BelongsTo,
} from "sequelize-typescript";
import Monedero from "./Monedero";

@Table({
  tableName: "movimiento_monedero_cliente",
})
class MovimientoMonederoCliente extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_mov_monedero: string;

  @ForeignKey(() => Monedero)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  id_monedero!: string;

  @BelongsTo(() => Monedero)
  monedero!: Monedero;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  cantidad_mov!: number;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
  })
  tipo_mov!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  referencia!: string;

  @Default(DataType.NOW)
  @Column(DataType.DATE)
  fecha_mov!: Date;
}
export default MovimientoMonederoCliente;