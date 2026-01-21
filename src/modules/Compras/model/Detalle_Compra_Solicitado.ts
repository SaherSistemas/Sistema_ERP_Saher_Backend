import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Articulo from "../../Inventario/Articulos/model/Articulo";

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

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })
    declare idarticulo_detcompsol: string

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_detcompsol: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_detcompsol: number

    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;
}

export default Detalle_Compra_Solicitado