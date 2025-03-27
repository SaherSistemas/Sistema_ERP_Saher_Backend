import { Table, Column, DataType, Model, PrimaryKey } from 'sequelize-typescript'

@Table({
    tableName: 'estado'
})

class Estado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    id_esta: number

    //LLAVE DE LA TABLA PAIS
    @Column({
        type: DataType.SMALLINT
    })
    id_pais_esta: number

    @Column({
        type: DataType.STRING(100)
    })
    nom_esta: string
}

export default Estado