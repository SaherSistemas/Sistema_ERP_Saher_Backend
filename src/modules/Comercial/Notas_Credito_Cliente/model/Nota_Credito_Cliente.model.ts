import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, BelongsTo,
    Default, AllowNull
} from 'sequelize-typescript';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Devolucion_Cliente from '../../Devoluciones_Cliente/model/Devolucion_Cliente.model';

/**
 * Nota de Crédito al Cliente
 *
 * Se genera automáticamente al aprobar una devolución cuya factura
 * ya estaba completamente pagada (CxC en estatus PAG).
 *
 * Cuando la factura NO estaba pagada, el monto se descuenta directamente
 * de la CxC y NO se genera este registro.
 *
 * ESTATUS:
 *   DISPONIBLE → saldo_disponible > 0, aún no se ha aplicado
 *   PARCIAL     → se aplicó parte pero queda saldo
 *   APLICADA    → saldo_disponible = 0
 */
@Table({ tableName: 'nota_credito_cliente', timestamps: true })
class Nota_Credito_Cliente extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_nota_credito: string;

    @ForeignKey(() => Cliente_Almacen)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_cliente_alm: string;

    @ForeignKey(() => Devolucion_Cliente)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_devolucion_cliente: string;

    /** Monto aprobado en la devolución (nunca cambia) */
    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto_original: number;

    /** Saldo aún disponible para aplicar a facturas futuras */
    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare saldo_disponible: number;

    /** DISPONIBLE | PARCIAL | APLICADA */
    @Default('DISPONIBLE')
    @Column({ type: DataType.STRING(15), allowNull: false })
    declare estatus: string;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare concepto: string | null;

    /** UUID SAT del CFDI-E emitido al aprobar la devolución */
    @AllowNull(true)
    @Column(DataType.STRING(50))
    declare uuid_cfdi_egreso: string | null;

    // ── Relaciones ────────────────────────────────────────────────────────
    @BelongsTo(() => Cliente_Almacen)
    declare cliente: Cliente_Almacen;

    @BelongsTo(() => Devolucion_Cliente)
    declare devolucion: Devolucion_Cliente;
}

export default Nota_Credito_Cliente;
