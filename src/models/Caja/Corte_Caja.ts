import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";

import Caja from "./Caja";
import Empleado from "../Usuarios/Empleado/Empleado";
import Movimiento_Caja from "./Movimiento_Caja";
import Venta from "../Venta/Venta";

@Table({
    tableName: "corte_caja"
})
class CorteCaja extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_corte: string;

    @ForeignKey(() => Caja)
    @Column({
        type: DataType.UUID,
    })
    declare id_caja: string;

    @BelongsTo(() => Caja)
    idcaja: Caja;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_apertura: string;

    @BelongsTo(() => Empleado)
    empleado_apertura: Empleado;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_apertura: Date;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_cierre: string;

    @BelongsTo(() => Empleado)
    empleado_cierre: Empleado;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_cierre: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_inicial: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_final: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare total_venta: number;

    // @Column({
    //     type: DataType.DECIMAL(10, 2),
    //     allowNull: false,
    //     defaultValue: 0,
    // })
    // declare total_movimientos: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_declarado: number;

    @Column({
        type: DataType.BOOLEAN,
    })
    declare status_corte: boolean;

    @HasMany(() => Movimiento_Caja)
    declare movimientos?: Movimiento_Caja[];

    @HasMany(() => Venta)
    declare ventas?: Venta[];

}

export default CorteCaja;
