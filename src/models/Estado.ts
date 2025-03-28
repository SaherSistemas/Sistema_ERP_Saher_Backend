import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, BelongsTo, Unique, HasMany } from 'sequelize-typescript'
import Pais from './Pais'
import Ciudad from './Ciudad'

@Table({
    tableName: 'estado'
})

class Estado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    declare id_esta: number

    //LLAVE DE LA TABLA PAIS
    @ForeignKey(() => Pais)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_pais_esta: number

    @Unique
    @Column({
        type: DataType.STRING(100)
    })
    declare nom_esta: string

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