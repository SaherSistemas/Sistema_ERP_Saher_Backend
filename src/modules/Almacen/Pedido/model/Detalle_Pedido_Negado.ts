import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo,
    AllowNull,
} from 'sequelize-typescript';
import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';

@Table({
    tableName: 'detalle_pedido_negado',
    timestamps: false,
})
export default class Detalle_Pedido_Negado extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_pedido_negado: string;

    @ForeignKey(() => Detalle_Pedido_Almacen)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen: string;

    @AllowNull(false)
    @Column(DataType.SMALLINT)
    declare cantidad_negada: number;

    @AllowNull(false)
    @Column(DataType.STRING(50))
    declare motivo: string;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare comentario: string | null;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    declare fecha: Date;

    @BelongsTo(() => Detalle_Pedido_Almacen)
    declare detalle: Detalle_Pedido_Almacen;
}
