import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, BelongsTo, Unique, HasMany, Default } from 'sequelize-typescript'
import Pais from './Pais'
import Ciudad from './Ciudad'

@Table({
    tableName: 'estado'
})

class Estado extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID
    })
    declare id_esta: string;

    @Unique
    @Column({
        type: DataType.SMALLINT
    })
    declare id_intesta: number

    //LLAVE DE LA TABLA PAIS
    @ForeignKey(() => Pais)
    @Column({
        type: DataType.UUID
    })
    declare id_pais_esta: string

    @Unique
    @Column({
        type: DataType.STRING(100)
    })
    declare nom_esta: string

    @Unique
    @Column({
        type: DataType.STRING(5)
    })
    declare clave_ent_fed_estado: string

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare activo_estado: boolean

    // Relación: Un estado pertenece a un país
    @BelongsTo(() => Pais)
    pais: Pais;

    // UN ESTADO TIENE MUCHAS CIUDADES
    @HasMany(() => Ciudad)
    ciudades: Ciudad[];
}

export default Estado