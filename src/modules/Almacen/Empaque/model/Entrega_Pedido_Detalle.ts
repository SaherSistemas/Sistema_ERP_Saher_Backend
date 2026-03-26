import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    AllowNull,
    ForeignKey,
    BelongsTo
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Entrega_Pedido } from './Entrega_Pedido';
import { Bulto_Pedido } from './Bulto_Pedido';


@Table({
    tableName: 'entrega_pedido_detalle',
    timestamps: true
})
export class Entrega_Pedido_Detalle extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column({
        type: DataType.UUID
    })
    declare id_entrega_detalle: string;

    @ForeignKey(() => Entrega_Pedido)
    @AllowNull(false)
    @Column({
        type: DataType.UUID
    })
    declare id_entrega_pedido: string;

    @ForeignKey(() => Bulto_Pedido)
    @AllowNull(false)
    @Column({
        type: DataType.UUID
    })
    declare id_bulto: string;





    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataType.BOOLEAN
    })
    declare escaneado: boolean;

    @AllowNull(false)
    @Column({
        type: DataType.DATE
    })
    declare fecha_escaneo: Date;


    @BelongsTo(() => Entrega_Pedido, {
        foreignKey: 'id_entrega_pedido',
        targetKey: 'id_entrega_pedido',
        as: 'entrega'
    })
    declare entrega?: Entrega_Pedido;

    @BelongsTo(() => Bulto_Pedido, {
        foreignKey: 'id_bulto',
        targetKey: 'id_bulto',
        as: 'bulto'
    })
    declare bulto?: Bulto_Pedido;
}