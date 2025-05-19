import { Column, Model, DataType, Table, PrimaryKey, HasMany, Unique, Default, ForeignKey, BelongsTo } from "sequelize-typescript";
import Ciudad from "./Ciudad";

@Table({
    tableName: "colonia"
})
class Colonia extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID
    })
    declare id_colonia: string;

    @Unique
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare id_intcolonia: number;

    @ForeignKey(() => Ciudad)
    @Column({
        type: DataType.UUID
    })
    declare id_ciuda_colonia: string

    @Unique
    @Column({
        type: DataType.STRING(50),
        allowNull: false
    })
    declare nom_colonia: string;

    @Unique
    @Column({
        type: DataType.STRING(5),
        allowNull: false
    })
    declare cp_colonia: string

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare activa_colonia: boolean

    @BelongsTo(() => Ciudad)
    ciudad: Ciudad;
}

export default Colonia