import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import Cliente from "../Cliente";

@Table({
  tableName: "monedero_cliente",
})
class Monedero extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_monedero: string;

  @Column({
    type: DataType.DECIMAL(12, 2),
    get(this: any) {
      const raw = this.getDataValue("saldo_monedero");
      return raw === null ? null : Number(raw);
    },
  })
  declare saldo_monedero: number;

  @Column({
    type: DataType.DATE,
  })
  declare fecha_creacion: Date;

  @Column({
    type: DataType.DATE,
  })
  declare fecha_expiro: Date;

  @ForeignKey(() => Cliente)
  @Column({
    type: DataType.UUID,
  })
  declare id_cliente: string;
  @BelongsTo(() => Cliente)
  cliente: Cliente;
}

export default Monedero;
