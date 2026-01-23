import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Agente_de_Venta from "./Agente_De_Venta";

@Table({
    tableName: "prioridad_agente_reglas"
})


class Prioridad_Agente_Reglas extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_regla_agente: string;


    @ForeignKey(() => Agente_de_Venta)
    @Column({
        type: DataType.UUID,
    })
    declare id_agente: string;

    @Column({
        type: DataType.SMALLINT
    })
    declare dia_semana: number

    @Column({
        type: DataType.TIME
    })
    declare hora_recibo_max: string

    @Column({
        type: DataType.TIME
    })
    declare hora_entrega_max: string

    @Column({
        type: DataType.BOOLEAN
    })
    declare activa: boolean
}
export default Prioridad_Agente_Reglas;