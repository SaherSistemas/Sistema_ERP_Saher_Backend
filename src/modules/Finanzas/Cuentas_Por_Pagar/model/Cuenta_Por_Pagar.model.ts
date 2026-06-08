import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, Default, BelongsTo, HasMany,
} from 'sequelize-typescript';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Empleado from '../../../RRHH/model/Empleado';
import Factura_Compra_Proveedor from './Factura_Compra_Proveedor';
import Pago_CxP from './Pago_CxP.model';

/*
 ESTATUS CxP
 PEN → Pendiente  (sin pagos)
 PAR → Parcial    (pagos parciales)
 PAG → Pagada     (100 %)
 VEN → Vencida    (fecha_vencimiento < hoy && saldo > 0)
 CAN → Cancelada
*/

@Table({ tableName: 'cuenta_por_pagar', timestamps: true, underscored: false })
class Cuenta_Por_Pagar extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_cxp: string;

    @ForeignKey(() => Factura_Compra_Proveedor)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_factura_proveedor: string | null;

    @ForeignKey(() => Proveedor)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_proveedor: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    declare folio_factura: string | null;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    declare fecha_factura: Date | null;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha_vencimiento: Date;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare monto_total: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare monto_pagado: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare saldo_pendiente: number;

    @Column({ type: DataType.CHAR(3), allowNull: false, defaultValue: 'PEN' })
    declare estatus_cxp: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_registro: string | null;

    // ── Relaciones ──────────────────────────────────────────────────────────────
    @BelongsTo(() => Proveedor, 'id_proveedor')
    declare proveedor: Proveedor;

    @BelongsTo(() => Factura_Compra_Proveedor, 'id_factura_proveedor')
    declare factura_compra: Factura_Compra_Proveedor;

    @BelongsTo(() => Empleado, 'id_empleado_registro')
    declare empleado_registro: Empleado;

    @HasMany(() => Pago_CxP, 'id_cxp')
    declare pagos: Pago_CxP[];
}

export default Cuenta_Por_Pagar;
