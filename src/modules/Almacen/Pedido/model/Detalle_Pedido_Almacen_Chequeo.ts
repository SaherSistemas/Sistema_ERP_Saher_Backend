// models/Detalle.ts
import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo,
    HasMany,
    Index,
    AllowNull
} from 'sequelize-typescript';
import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';
import Detalle_Pedido_Almacen_Lote from './Detalle_Pedido_Almacen_Lote';
import Empleado from '../../../RRHH/model/Empleado';


export type EstadoAsignacionDetalle =
    | 'ASIGNADO'
    | 'EN_PROCESO'
    | 'TERMINADO'
    | 'CANCELADO';



@Table({
    tableName: 'detalle_pedido_almacen_chequeo',
    timestamps: false
})

export default class Detalle_Pedido_Almacen_Chequeo extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_chequeo: string;

    @ForeignKey(() => Detalle_Pedido_Almacen)
    @Index('ix_detalle_pedido_chequeo')
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen: string;

    @BelongsTo(() => Detalle_Pedido_Almacen, { as: 'detalle_pedido', foreignKey: 'id_detalle_pedido_almacen' })
    detalle_pedido: Detalle_Pedido_Almacen;

    // Lote específico que se está chequeando (uno por fila)
    @ForeignKey(() => Detalle_Pedido_Almacen_Lote)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen_lote: string | null;

    @BelongsTo(() => Detalle_Pedido_Almacen_Lote, { as: 'detalle_lote', foreignKey: 'id_detalle_pedido_almacen_lote' })
    detalle_lote: Detalle_Pedido_Almacen_Lote;

    // Cantidad surtida para este lote (target del chequeo)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    declare cant_surtida_lote: number | null;

    @ForeignKey(() => Empleado)
    @Column(DataType.UUID)
    declare id_empleado: string;

    @BelongsTo(() => Empleado)
    empleado: Empleado;

    // Estado
    @AllowNull(false)
    @Default('ASIGNADO')
    @Column(
        DataType.ENUM(
            'ASIGNADO',
            'EN_PROCESO',
            'TERMINADO',
            'CANCELADO'
        )
    )
    declare estado: EstadoAsignacionDetalle;



    // Fecha cuando se asigna
    @AllowNull(false)
    @Default(DataType.NOW)
    @Column(DataType.DATE)
    declare fecha_asignado: Date;

    // Cuando inicia surtido
    @AllowNull(true)
    @Column(DataType.DATE)
    declare inicio: Date | null;

    // Cuando termina surtido
    @AllowNull(true)
    @Column(DataType.DATE)
    declare fin: Date | null;

    //cant_chequeada
    @AllowNull(true)
    @Column(DataType.INTEGER)
    declare cant_chequeada: number | null;

    // Nota opcional
    @AllowNull(true)
    @Column(DataType.TEXT)
    declare nota: string | null;


}