import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";
import Colonia from "../Ubicacion/Colonia";

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
        type: DataType.STRING(50)
    })
    declare calle_empre: string

    @ForeignKey(() => Colonia)
    @Column({
        type: DataType.UUID
    })
    declare id_colonia_empre: string

    @Column({
        type: DataType.STRING(100)
    })
    declare correo_empre: string

    @Column({
        type: DataType.STRING(20)
    })
    declare tele_empre: string

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare status_empre: boolean

    @BelongsTo(() => Colonia)
    colonia: Colonia;

}

export default Empresa_Sucursal