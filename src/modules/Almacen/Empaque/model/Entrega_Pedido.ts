import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    AllowNull,
    ForeignKey,
    BelongsTo,
    HasMany
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { Entrega_Pedido_Detalle } from './Entrega_Pedido_Detalle';
import { Entrega_Pedido_Firma } from './Entrega_Pedido_Firma';



@Table({
    tableName: 'entrega_pedido',
    timestamps: true
})
export class Entrega_Pedido extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column({
        type: DataType.UUID
    })
    declare id_entrega_pedido: string;


    @AllowNull(false)
    @Column({
        type: DataType.ENUM('ALMACEN', 'AGENTE')
    })
    declare tipo_origen: 'ALMACEN' | 'AGENTE';
    @AllowNull(false)
    @Column({
        type: DataType.ENUM('AGENTE', 'CLIENTE')
    })
    declare tipo_destino: 'AGENTE' | 'CLIENTE';

    @ForeignKey(() => Agente_de_Venta)
    @AllowNull(true)
    @Column({
        type: DataType.UUID
    })
    declare id_agente?: string | null;

    @ForeignKey(() => Cliente_Almacen)
    @AllowNull(true)
    @Column({
        type: DataType.UUID
    })
    declare id_cliente?: string | null;

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column({
        type: DataType.DATE
    })
    declare fecha_salida: Date;

    @AllowNull(false)
    @Default('ABIERTA')
    @Column({
        type: DataType.ENUM('ABIERTA', 'ENTREGADA', 'CANCELADA')
    })
    declare estado: 'ABIERTA' | 'ENTREGADA' | 'CANCELADA';

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataType.SMALLINT
    })
    declare total_pedidos: number;

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataType.SMALLINT
    })
    declare total_cajas: number;

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataType.SMALLINT
    })
    declare total_bolsas: number;

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataType.SMALLINT
    })
    declare total_bultos: number;

    @AllowNull(true)
    @Column({
        type: DataType.TEXT
    })
    declare firma_recibido?: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.DATE
    })
    declare fecha_firma?: Date | null;

    @BelongsTo(() => Agente_de_Venta, {
        foreignKey: 'id_agente',
        targetKey: 'id_agente',
        as: 'agente'
    })
    declare agente?: Agente_de_Venta;

    @BelongsTo(() => Cliente_Almacen, {
        foreignKey: 'id_cliente',
        targetKey: 'id_cliente_alm',
        as: 'cliente'
    })
    declare cliente?: Cliente_Almacen;

    @HasMany(() => Entrega_Pedido_Detalle, {
        foreignKey: 'id_entrega_pedido',  // ← FK real en la tabla hija
        as: 'detalles'
    })
    declare detalles?: Entrega_Pedido_Detalle[];

    @HasMany(() => Entrega_Pedido_Firma, {
        foreignKey: 'id_entrega',
        as: 'firmas'
    })
    declare firmas?: Entrega_Pedido_Firma[];
    validateDestino() {
        const esAgenteValido =
            this.tipo_destino === 'AGENTE' &&
            !!this.id_agente &&
            !this.id_cliente;

        const esClienteValido =
            this.tipo_destino === 'CLIENTE' &&
            !!this.id_cliente &&
            !this.id_agente;

        if (!esAgenteValido && !esClienteValido) {
            throw new Error(
                'Destino inválido: para AGENTE debe existir id_agente y id_cliente debe ser null; para CLIENTE debe existir id_cliente y id_agente debe ser null.'
            );
        }
    }
}