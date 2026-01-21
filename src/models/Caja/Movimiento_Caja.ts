import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Metodo_de_Pago from "./Metodo_de_Pago";
import Empleado from "../../modules/RRHH/model/Empleado";
import Caja from "./Caja";
import CorteCaja from "./Corte_Caja";

@Table({
    tableName: "movimiento_caja"
})

class Movimiento_Caja extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_movimiento: string;

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
    idcorte: CorteCaja;

    @Column({
        type: DataType.STRING(30),
    })
    declare tipo_movimiento: string;

    @Column({
        type: DataType.STRING(50),
    })
    declare concepto_movimiento: string;

    @ForeignKey(() => Metodo_de_Pago)
    @Column({
        type: DataType.UUID,
    })
    declare id_metodo_pago: string;
    @BelongsTo(() => Metodo_de_Pago)
    metodo_pago: Metodo_de_Pago;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_movimiento: number;

    @Column({
        type: DataType.STRING(100),
    })
    declare referencia?: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_empleado: string;
    @BelongsTo(() => Empleado, { as: 'empleado' })
    empleado: Empleado;


}

export default Movimiento_Caja;