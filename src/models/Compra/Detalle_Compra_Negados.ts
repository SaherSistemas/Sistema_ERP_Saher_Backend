import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Articulo from "../Articulos/Articulo";

@Table({
    tableName: 'detalle_compra_negados'
})

class Detalle_Compra_Negados extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_detcompneg: string

    @ForeignKey(() => Compra)
    @Column({
        type: DataType.UUID
    })
    declare idcompr_detcompneg: string

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })
    declare idarticulo_detcompneg: string

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_detcompneg: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_detcompneg: number


    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;
}

export default Detalle_Compra_Negados