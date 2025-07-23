import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";

@Table({
    tableName: "parametro_caja"
})  

class ParametroCaja extends Model {
    @PrimaryKey
    @Column({ 
        type: DataType.UUID,
     })
     declare id_parametro_caja: string;

    //@ForeignKey(() => Caja)
    @Column({
        type: DataType.UUID
    })
    declare id_caja: string;

    @Column({
        type: DataType.DECIMAL(10, 2)
    })
    declare monto_max_efectivo: number;

    @Column({
        type: DataType.DECIMAL(10, 2)
    })
    declare monto_min_efectivo: number;


}

export default ParametroCaja;