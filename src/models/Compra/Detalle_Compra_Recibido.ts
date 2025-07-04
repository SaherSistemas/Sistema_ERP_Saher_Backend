import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Articulo from "../Articulos/Articulo";

@Table({
    tableName: 'detalle_compra_recibido'
})

class Detalle_Compra_Recibido extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_detcomprec: string

    @ForeignKey(() => Compra)
    @Column({
        type: DataType.UUID
    })
    declare idcompr_detcomprec: string

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })
    declare idarticulo_detcomprec: string

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_detcomprec: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_detcomprec: number

    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;
}

export default Detalle_Compra_Recibido