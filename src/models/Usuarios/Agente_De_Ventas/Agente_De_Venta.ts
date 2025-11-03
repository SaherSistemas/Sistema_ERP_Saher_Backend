import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Empleado from "../Empleado/Empleado";

@Table({
    tableName: "agente_de_venta"
})


class Agente_de_Venta extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_agente: string;


    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_empleado: string;


    @Column({
        type: DataType.DATE
    })
    declare fecha_alta_agente: Date

    @Column({
        type: DataType.BOOLEAN
    })
    declare estatus_agente: boolean
}
export default Agente_de_Venta;