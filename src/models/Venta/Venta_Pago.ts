import {
  Table,
  HasOne,
  Column,
  Model,
  HasMany,
  PrimaryKey,
  DataType,
  ForeignKey,
  Default,
  BelongsTo,
} from "sequelize-typescript";
import Venta from "./Venta";
import Metodo_de_Pago from "../Caja/Metodo_de_Pago";

@Table({ 
  tableName: "venta_pago"

})
class Venta_Pago extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_venta_pago: string;

  @ForeignKey(() => Venta)
  @Column({
    type: DataType.UUID,
  })
  declare id_venta: string;
  @BelongsTo(() => Venta)
  venta: Venta;

  @ForeignKey(() => Metodo_de_Pago)
  @Column({
    type: DataType.UUID,
  })
  declare id_metodo_pago: string;
  @BelongsTo(() => Metodo_de_Pago, { as: "metodo_pago" })
  metodo_pago: Metodo_de_Pago;

  @Column({
    type: DataType.DECIMAL(12, 2),
  })
  declare monto: number;
}
export default Venta_Pago;
