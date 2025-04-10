import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique } from "sequelize-typescript";

@Table({
    tableName: 'clasificacion'
})

class Clasificacion extends Model {
    @PrimaryKey
    @Column({
        type: DataType.CHAR(1)
    })
    declare id_clasifi: string

    @Column({
        type: DataType.STRING(30)
    })
    declare descrip_clasifi: string

    @Column({
        type: DataType.DECIMAL(5, 2)
    })
    declare margen_clasifi: number
}

export default Clasificacion