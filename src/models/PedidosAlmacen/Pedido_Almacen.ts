import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Cliente_Almacen from "../Clientes/Cliente_Almacen/Cliente_Almacen";

@Table({
    tableName: "pedido_almacen"
})


class Pedido_Almacen extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_pedido_alm: string;

    @Unique
    @Column({
        type: DataType.BIGINT,
    })
    declare cod_int_pedido_alm: number;

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_facturado_pedido_alm: Date

    @Column({
        type: DataType.CHAR(1)
    })
    declare status_pedido_alm: string

    @Column({
        type: DataType.DATE
    })
    declare fecha_entrega_alm: Date

    
    @Column({
        type: DataType.DATE
    })
    declare fecha_max_entrega_alm: Date

    @Column({
        type: DataType.CHAR(4)
    })
    declare tipo_pedido_alm: string

    @Column({
        type:DataType.DATE
    })
    declare entrega_al_cliente: Date

    @ForeignKey(() => Cliente_Almacen)
    @Column({
        type: DataType.UUID
    })
    declare id_cliente_pedido_alm: string

}
export default Pedido_Almacen;