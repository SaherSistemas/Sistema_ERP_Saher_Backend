import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Cliente_Almacen from "../Clientes/Cliente_Almacen/Cliente_Almacen";
import Pedido_Almacen from "./Pedido_Almacen";
import Usuario from "../Usuarios/Usuario";

@Table({
    tableName: "pedido_flujo_log"
})


class Pedido_Flujo_Log extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_ped_flujo: string;

    @ForeignKey(() => Pedido_Almacen)
    @Unique
    @Column({
        type: DataType.UUID,
    })
    declare id_pedido: string;

    @ForeignKey(() => Usuario)
    @Column({
        type: DataType.UUID
    })
    declare surtido_usuario: string

    @Column({
        type: DataType.DATE
    })
    declare surtido_inicio: Date

    @Column({
        type: DataType.DATE
    })
    declare surtido_fin: Date

    @ForeignKey(() => Usuario)
    @Column({
        type: DataType.UUID
    })
    declare checado_usuario: string

    @Column({
        type: DataType.DATE
    })
    declare checado_inicio: Date

    @Column({
        type: DataType.DATE
    })
    declare checado_fin: Date

    @ForeignKey(() => Usuario)
    @Column({
        type: DataType.UUID
    })
    declare empacado_usuario: string

    @Column({
        type: DataType.DATE
    })
    declare empacado_inicio: Date

    @Column({
        type: DataType.DATE
    })
    declare empacado_fin: Date

    @Column({
        type: DataType.TEXT
    })
    declare observaciones_pedido: string
    
}
export default Pedido_Flujo_Log;