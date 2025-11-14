import {
  Table,
  HasOne,
  Column,
  Model,
  PrimaryKey,
  DataType,
  ForeignKey,
  Default,
  BelongsTo,
} from "sequelize-typescript";
import Articulo from "../Articulos/Articulo";
import LoteUsadoVenta from "../LotesYCaducidad/Lote_Usado_Venta";
import Venta from "./Venta";

@Table({
  tableName: "detalle_venta",
})
class DetalleVenta extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_detalle_venta: string;

  @ForeignKey(() => Venta)
  @Column({
    type: DataType.UUID,
  })
  declare id_venta: string;
  @BelongsTo(() => Venta)
  venta!: Venta;

  @ForeignKey(() => Articulo)
  @Column({
    type: DataType.UUID,
  })
  declare id_artic: string;
  @BelongsTo(() => Articulo)
  articulo: Articulo;

  @Column({
    type: DataType.INTEGER,
  })
  declare cantidad: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
  })
  declare precio_unitario: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
  })
  declare total_renglon: number;

  @HasOne(() => LoteUsadoVenta)
  declare lote_usado: LoteUsadoVenta;
}

export default DetalleVenta;
