import { Table, Column, DataType, PrimaryKey, Model } from 'sequelize-typescript'

@Table({
    tableName: 'temporabilidad'
})
class Temporabilidad extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    declare id_tempo: number

    @Column({
        type: DataType.STRING(30)
    })
    declare descrip_tempo: string

    @Column({
        type: DataType.SMALLINT
    })
    declare mesinicio_tempo: number

    @Column({
        type: DataType.SMALLINT
    })
    declare mesfin_tempo: number
}

export default Temporabilidad