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
import Cliente from "../Clientes/Cliente";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import DetalleVenta from "./Detalle_Venta";
import Empleado from "../Usuarios/Empleado/Empleado";
import Venta_Pago from "./Venta_Pago";
import UsoOferta from "../Ofertas/UsoOferta";
import Caja from "../Caja/Caja";
import CorteCaja from "../Caja/Corte_Caja";

@Table({
  tableName: "venta",
})
class Venta extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
  })
  declare id_venta: string;

  @ForeignKey(() => Caja)
  @Column({
    type: DataType.UUID,
  })
  declare id_caja: string;
  @BelongsTo(() => Caja)
  idcaja: Caja;

  @ForeignKey(() => CorteCaja)
  @Column({
    type: DataType.UUID,
  })
  declare id_corte: string;
  @BelongsTo(() => CorteCaja)
  corte?: CorteCaja;

  @ForeignKey(() => Cliente)
  @Column({
    type: DataType.UUID,
  })
  declare id_cliente: string;
  @BelongsTo(() => Cliente)
  idcliente: Cliente;

  @ForeignKey(() => Empleado)
  @Column({
    type: DataType.UUID,
  })
  declare id_empleado: string;
  @BelongsTo(() => Empleado)
  idempleado: Empleado;

  @ForeignKey(() => Empresa_Sucursal)
  @Column({
    type: DataType.UUID,
  })
  declare id_empre: string;
  @BelongsTo(() => Empresa_Sucursal)
  idempre: Empresa_Sucursal;

  @Column({
    type: DataType.DECIMAL(10, 2),
  })
  declare total_venta: number;

  @Column({
    type: DataType.STRING,
  })
  declare tipo_venta: string;

  @Column({
    type: DataType.STRING,
  })
  declare status_venta: String;

  @HasMany(() => DetalleVenta)
  declare detalle_venta: DetalleVenta[];

  @HasMany(() => Venta_Pago)
  declare venta_pago: Venta_Pago[];

  @HasMany(() => UsoOferta)
  usooferta?: UsoOferta[];
}

export default Venta;
