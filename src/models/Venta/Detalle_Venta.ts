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
  HasMany,
} from "sequelize-typescript";
import LoteUsadoVenta from "../LotesYCaducidad/Lote_Usado_Venta";
import Venta from "./Venta";
import Articulo from "../../modules/Catalogos/Articulos/model/Articulo";

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
  @BelongsTo(() => Articulo, { as: "articulo" })
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

  @HasMany(() => LoteUsadoVenta, { as: "lote_usado" })
  declare lote_usado: LoteUsadoVenta[];

}

export default DetalleVenta;
