import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    HasMany
} from 'sequelize-typescript';
import Remision from '../../Remisiones/model/Remision.model';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Pago_CxC from './Pago_CxC.model';
import Facturas from '../../../Facturas/model/Facturas.model';

/*
    ESTATUS CXC
    PEN → Pendiente  (sin abonos)
    PAR → Parcial    (abonos pero no liquidada)
    PAG → Pagada     (saldo = 0)
    VEN → Vencida    (fecha_vencimiento < hoy y saldo > 0)

    ORIGEN — solo uno viene lleno:
    ┌─ id_factura  → factura timbrada directo al cliente real
    └─ id_remision → factura timbrada a Público General

    En ambos casos id_cliente_alm viene del Pedido (id_cliente_pedido_alm)
    y representa siempre al cliente real al que se le cobra.
*/

@Table({
    tableName: 'cuenta_por_cobrar'
})
class Cuenta_Por_Cobrar extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare id_cxc: string;

    // ── Flujo normal: factura directo al cliente real ──
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_factura: string;

    // ── Flujo Público General: factura a PG + remisión interna ──
    @ForeignKey(() => Remision)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_remision: string;

    // Cliente real — sacado siempre del Pedido (id_cliente_pedido_alm)
    @ForeignKey(() => Cliente_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_cliente_alm: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare monto_total: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare monto_pagado: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare saldo_pendiente: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare fecha_vencimiento: Date;

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare dias_credito: number;

    @Column({
        type: DataType.CHAR(3),
        allowNull: false,
        defaultValue: 'PEN'
    })
    declare estatus_cxc: string;

    // =====================
    //      RELACIONES
    // =====================

    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Remision)
    remision: Remision;

    @BelongsTo(() => Cliente_Almacen)
    cliente_almacen: Cliente_Almacen;

    @HasMany(() => Pago_CxC)
    pagos: Pago_CxC[];
}

export default Cuenta_Por_Cobrar;
