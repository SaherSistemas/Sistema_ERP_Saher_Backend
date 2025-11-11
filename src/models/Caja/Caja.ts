import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasMany } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Venta from "../Venta/Venta";
import CorteCaja from "./Corte_Caja";
import { MovimientoCajaController } from "../../controllers/Caja/Movimiento_CajaController";
import Movimiento_Caja from "./Movimiento_Caja";


@Table({
    tableName: "caja"
})

class Caja extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_caja: string;

    @Unique
    @Column({
        type: DataType.STRING(50),
    })
    declare nombre_caja: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
    })
    declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    Sucursal: Empresa_Sucursal;

    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare activa: boolean;

    @HasMany(() => Venta)
    declare ventas?: Venta[];

    @HasMany(() => CorteCaja)
    declare cortes?: CorteCaja[];

    @HasMany(() => Movimiento_Caja)
    declare movimientos?: Movimiento_Caja[];


}

export default Caja;