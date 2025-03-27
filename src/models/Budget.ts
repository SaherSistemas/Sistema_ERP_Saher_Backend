import { Table, Column, DataType, Model } from 'sequelize-typescript'

@Table({
    tableName: 'Budget'
})

class Budget extends Model {
    @Column({
        type: DataType.STRING(50)
    })
    name: string

    @Column({
        type: DataType.DECIMAL
    })
    amount: number
}

export default Budget