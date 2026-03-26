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
import Pedido_Almacen_Empaque from './Pedido_Almacen_Empaque';

@Table({
    tableName: 'bulto_pedido',
    timestamps: true
})
export class Bulto_Pedido extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID
    })
    declare id_bulto: string;

    @ForeignKey(() => Pedido_Almacen_Empaque)
    @AllowNull(false)
    @Column({
        type: DataType.UUID
    })
    declare id_pedido_empaque: string;


    @Column({
        type: DataType.STRING
    })
    declare cod_bulto: string;

    @AllowNull(false)
    @Column({
        type: DataType.ENUM('CAJA', 'BOLSA')
    })
    declare tipo_bulto: 'CAJA' | 'BOLSA';

    @AllowNull(false)
    @Column({
        type: DataType.SMALLINT
    })
    declare num_bulto: number;

    @AllowNull(false)
    @Column({
        type: DataType.SMALLINT
    })
    declare total_bulto: number;

    @Default(false)
    @AllowNull(false)
    @Column({
        type: DataType.BOOLEAN
    })
    declare escaneado: boolean;

    @BelongsTo(() => Pedido_Almacen_Empaque, {
        foreignKey: 'id_pedido_empaque',
        targetKey: 'id_pedido_empaque',
        as: 'empaque'
    })
    declare empaque?: Pedido_Almacen_Empaque;
}