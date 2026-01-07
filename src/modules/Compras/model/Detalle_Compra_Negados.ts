import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Articulo from "../../../models/Articulos/Articulo";

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
    declare cantidad_negada: number

    @Column({
        type: DataType.TEXT
    })
    declare motivo_negado: string


    @Default(false)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare recuperado: boolean;

    @Default(DataType.NOW)
    @Column({
        type: DataType.DATEONLY,
    })
    declare fecha_negado: Date;

    @Column({
        type: DataType.DATEONLY,
    })
    declare fecha_limite_recuperacion: Date;


    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;
}

export default Detalle_Compra_Negados