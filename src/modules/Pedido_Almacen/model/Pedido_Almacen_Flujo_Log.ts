import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Pedido_Almacen from "./Pedido_Almacen";
import Usuario from "../../../models/Usuarios/Usuario";
import Agente_de_Venta from "../../../models/Usuarios/Agente_De_Ventas/Agente_De_Venta";

@Table({
    tableName: "pedido_almacen_flujo_log"
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


    @Column({
        type: DataType.DATE
    })
    declare inicio_pedido: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_pedido: Date

    @ForeignKey(() => Agente_de_Venta)
    @Column({
        type: DataType.UUID
    })
    declare captura_agente: string

    @Column({
        type: DataType.DATE
    })
    declare captura_inicio: Date

    @Column({
        type: DataType.DATE
    })
    declare captura_fin: Date

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


    //RELACIONES 
    @BelongsTo(() => Pedido_Almacen)
    pedido: Pedido_Almacen;


    @BelongsTo(() => Agente_de_Venta, 'captura_agente')
    capturaAgente: Agente_de_Venta;

    @BelongsTo(() => Usuario, 'surtido_usuario')
    surtidoUser: Usuario;

    @BelongsTo(() => Usuario, 'checado_usuario')
    checadoUser: Usuario;

    @BelongsTo(() => Usuario, 'empacado_usuario')
    empacadoUser: Usuario;
}
export default Pedido_Flujo_Log;