import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";

@Table({
    tableName: "presentacion_articulo"
})
class Presentacion_Articulo extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_presentacion: string

    @Column({
        type: DataType.STRING(50)
    })
    declare nom_presentacion: string
}

export default Presentacion_Articulo