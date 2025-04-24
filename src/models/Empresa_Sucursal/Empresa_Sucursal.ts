import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Ciudad from "../Ubicacion/Ciudad";

@Table({
    tableName: 'empresa_sucursal'
})

class Empresa_Sucursal extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_empre: string

    @Column({
        type: DataType.STRING(100)
    })
    declare nom_empre: string

    @Column({
        type: DataType.STRING(20)
    })
    declare rfc_empre: string

    @Column({
        type: DataType.CHAR(1),
        allowNull: false,
        defaultValue: true,
    })
    declare tipo_empre: string

    @Column({
        type: DataType.CHAR(5),
        allowNull: false
    })
    declare cp_empre: string

    @Column({
        type: DataType.STRING(50)
    })
    declare calle_empre: string

    @ForeignKey(() => Ciudad)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_ciudad_empre: number

    @Column({
        type: DataType.STRING(100)
    })
    declare correo_empre: string

    @Column({
        type: DataType.STRING(20)
    })
    declare tele_empre: string

    // Relación: Un estado pertenece a un país
    @BelongsTo(() => Ciudad)
    ciudad: Ciudad;

}

export default Empresa_Sucursal