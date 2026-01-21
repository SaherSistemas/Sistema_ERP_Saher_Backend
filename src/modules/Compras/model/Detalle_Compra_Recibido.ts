import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Detalle_Compra_Solicitado from "./Detalle_Compra_Solicitado";
import Articulo from "../../Inventario/Articulos/model/Articulo";
import LotesRecibidosCompra from "../../../models/LotesYCaducidad/LotesRecibidosCompra";

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

    @ForeignKey(() => Detalle_Compra_Solicitado)
    @Column(DataType.UUID)
    declare id_detallecompr_solicitado: string;



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

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare iva_detcomprec: number


    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;

    @BelongsTo(() => Detalle_Compra_Solicitado)
    detalleCompraSolicitado: Detalle_Compra_Solicitado;

    @HasMany(() => LotesRecibidosCompra)
    lotesRecibidos: LotesRecibidosCompra[];
}

export default Detalle_Compra_Recibido