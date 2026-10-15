import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

/**
 * Ajuste manual a la cobertura de una factura de proveedor (recibido + notas de crédito + ajustes = total).
 * monto > 0 → cubre lo que faltaba; monto < 0 → descuenta un exceso. Siempre lleva un comentario.
 * No modifica cuentas por pagar ni pagos: solo documenta por qué la factura se da por cuadrada.
 */
@Table({ tableName: 'ajuste_factura_proveedor', timestamps: false })
class Ajuste_Factura_Proveedor extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_ajuste: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura_proveedor: string;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare comentario: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado: string | null;

    @Column({ type: DataType.STRING(120), allowNull: true })
    declare usuario: string | null;

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    declare created_at: Date;
}

export default Ajuste_Factura_Proveedor;
