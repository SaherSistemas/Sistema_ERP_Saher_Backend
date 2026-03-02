// models/Detalle_Pedido_Almacen_Asignacion.ts
import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo,
    Index
} from 'sequelize-typescript';
import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';

export type EstadoAsignacionDetalle = 'ASIGNADO' | 'EN_PROCESO' | 'TERMINADO' | 'CANCELADO';

@Table({
    tableName: 'detalle_pedido_almacen_asignacion',
    timestamps: false
})
export default class Detalle_Pedido_Almacen_Asignacion extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_asignacion: string;

    @ForeignKey(() => Detalle_Pedido_Almacen)
    @Index('ix_asig_detalle')
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen: string;

    @Index('ix_asig_usuario')
    @Column(DataType.UUID)
    declare id_usuario: string;

    // Si ya tienes ENUM en Postgres, usa DataType.ENUM con los mismos valores
    @Column(DataType.ENUM('ASIGNADO', 'EN_PROCESO', 'TERMINADO', 'CANCELADO'))
    declare estado: EstadoAsignacionDetalle;

    @Column(DataType.DATE)
    declare fecha_asignado: Date;

    @Column(DataType.DATE)
    declare inicio: Date | null;

    @Column(DataType.DATE)
    declare fin: Date | null;

    @Column(DataType.TEXT)
    declare nota: string | null;

    @BelongsTo(() => Detalle_Pedido_Almacen)
    declare detalle?: Detalle_Pedido_Almacen;
}