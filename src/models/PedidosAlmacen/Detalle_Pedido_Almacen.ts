import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Pedido_Almacen from "./Pedido_Almacen";
import Articulo from "../Articulos/Articulo";

@Table({
    tableName: "detalle_pedido_almacen"
})


class Detalle_Pedido_Almacen extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_detalle_pedido_almacen: string;


    @ForeignKey(() => Pedido_Almacen)
    @Column({
        type: DataType.UUID
    })
    declare id_pedido_almacen: string

      @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })
    declare id_articulo: string

    @Column({
        type: DataType.SMALLINT,
    })
    declare cant_pedida: number;


    @Column({
        type: DataType.SMALLINT,
    })
    declare cantidad_surtida: number;


    @Column({
        type: DataType.SMALLINT,
    })
    declare cantidad_checada: number;

    @Column({
        type: DataType.DECIMAL(12,2)
    })
    declare precio_venta: number

    @Column({
        type: DataType.BOOLEAN
    })
    declare es_oferta: boolean

    @Column({
        type: DataType.DATE
    })
    declare fecha_max_entrega: number

    @Column({
        type: DataType.CHAR(4)
    })
    declare tipo_pedido_alm: string

  

}
export default Detalle_Pedido_Almacen;