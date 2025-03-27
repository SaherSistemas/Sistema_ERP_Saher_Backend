import { Table, Column, DataType, Model, PrimaryKey } from "sequelize-typescript";

@Table({
    tableName: 'ciudad'
})

class Ciudad extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    id_ciuda: number

    @Column({
        type: DataType.SMALLINT
    })
    id_esta_ciuda: number

    @Column({
        type: DataType.STRING()
    })
    nom_ciuda: string
}

export default Ciudad