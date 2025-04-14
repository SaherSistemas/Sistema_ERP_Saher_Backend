import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript'

@Table({
    tableName: 'empleado'
})

export class Empleado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.INTEGER
    })
    declare id_empleado: number;

    @Column({
        type: DataType.STRING(100)
    })
    declare nom_compl

    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_empre: string
}