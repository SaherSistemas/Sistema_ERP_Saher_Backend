import { Table, Column, Model, DataType, PrimaryKey, ForeignKey } from "sequelize-typescript";

@Table({
    tableName: "unidadmedida"
})
class UnidadMedida extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare id_medida: number

    @Column({
        type: DataType.STRING(30)
    })
    declare descrip_medida: string

    @Column({
        type: DataType.STRING(4)
    })
    declare sat_medida: string
}

export default UnidadMedida