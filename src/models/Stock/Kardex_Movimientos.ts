import { Column, Model, DataType, Table, PrimaryKey, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript'

@Table({
    tableName: "kardex_movimientos",
    timestamps: false
})


class Kardex_Movimientos extends Model {

    @PrimaryKey
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare id: number

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare empresa: number

    @Column({
        type: DataType.SMALLINT,
        allowNull: false,
    })
    declare articulo: number

    @Column({
        type: DataType.STRING(3),
        allowNull: false,
    })
    declare tipo_movimiento: string

    @Column({
        type: DataType.DATEONLY,
    })
    declare fecha_movimiento: Date

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare cantidad: number
}

export default Kardex_Movimientos;