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
import Cliente from "../Cliente"; 
import Empresa_Sucursal from "../../Empresa_Sucursal/Empresa_Sucursal";
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
  })
  declare id_monedero: string;
  @BelongsTo(() => Monedero)
  monedero : Monedero;

  @Column({
    type: DataType.FLOAT,
  })
  declare cantidad_mov: number;

  @Column({
    type: DataType.STRING,
  })
  declare tipo_mov: string; 

  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
  })
  declare fecha_mov: Date;

  @ForeignKey(() => Empresa_Sucursal)
  @Column({
    type: DataType.UUID,
  })
  declare id_empre: string;

  @BelongsTo(() => Empresa_Sucursal)
  empresaSucursal: Empresa_Sucursal;

  @ForeignKey(() => Cliente)
  @Column({
    type: DataType.UUID,
  })
  declare id_cliente: string;

  @BelongsTo(() => Cliente)
  cliente: Cliente;
}

export default MovimientoMonederoCliente;
