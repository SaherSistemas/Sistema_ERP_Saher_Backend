import { Column, Model, DataType, Table, PrimaryKey, Unique } from "sequelize-typescript";

@Table({
    tableName: "cat_regimen_fiscal"
})
class Cat_Regimen_Fiscal extends Model {
    @PrimaryKey
    @Column({
        type: DataType.STRING(3),
        allowNull: false
    })
    declare id_regimfisc: string

    @Unique
    @Column({
        type: DataType.STRING(150),
        allowNull: false
    })
    declare descripcion_regi: string
}

export default Cat_Regimen_Fiscal