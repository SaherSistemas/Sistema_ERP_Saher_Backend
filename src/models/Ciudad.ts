import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo } from "sequelize-typescript";
import Estado from "./Estado";

@Table({
    tableName: 'ciudad'
})

class Ciudad extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    declare id_ciuda: number

    @ForeignKey(() => Estado)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_esta_ciuda: number

    @Unique
    @Column({
        type: DataType.STRING()
    })
    declare nom_ciuda: string

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare activo_ciuda: boolean

    @BelongsTo(() => Estado)
    estado: Estado
}

export default Ciudad