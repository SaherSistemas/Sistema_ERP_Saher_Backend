import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra from './Compra'

@Table({
    tableName: 'detalle_compra_solicitado'
})

class Detalle_Compra_Solicitado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_detcompsol: string

    @ForeignKey(() => Compra)
    @Column({
        type: DataType.UUID
    })
    declare idcompr_detcompsol: string

}

export default Detalle_Compra_Solicitado