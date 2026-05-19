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
    Index,
    AllowNull
} from 'sequelize-typescript';

import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';
import Empleado from '../../../RRHH/model/Empleado';

export type EstadoAsignacionDetalle =
    | 'ASIGNADO'
    | 'EN_PROCESO'
    | 'TERMINADO'
    | 'CANCELADO';

@Table({
    tableName: 'detalle_pedido_almacen_asignacion',
    timestamps: true, // mejor tener createdAt / updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at'
})
export default class Detalle_Pedido_Almacen_Asignacion extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_asignacion: string;

    // FK al detalle
    @ForeignKey(() => Detalle_Pedido_Almacen)
    @Index('ix_asig_detalle')
    @AllowNull(false)
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen: string;

    // Usuario asignado
    @Index('ix_asig_usuario')

    @ForeignKey(() => Empleado)
    @AllowNull(false)
    @Column(DataType.UUID)
    declare id_usuario: string;

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

    // Nota opcional
    @AllowNull(true)
    @Column(DataType.TEXT)
    declare nota: string | null;

    // Orden de surtido según ubicación física (pasillo → anaquel → nivel → posición)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    declare orden: number | null;

    @BelongsTo(() => Detalle_Pedido_Almacen)
    declare detalle?: Detalle_Pedido_Almacen;

}