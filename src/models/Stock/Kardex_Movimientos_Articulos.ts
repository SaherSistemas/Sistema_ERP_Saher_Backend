import { Column, Model, DataType, Table, PrimaryKey, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript'

@Table({
    tableName: "kardex_movimientos_articulos",
    timestamps: false
})


class Kardex_Movimientos_Articulos extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_movimiento_articulo: string

    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empresa: string

    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_articulo: string

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
    declare cantidad_movimiento: number
}

export default Kardex_Movimientos_Articulos;