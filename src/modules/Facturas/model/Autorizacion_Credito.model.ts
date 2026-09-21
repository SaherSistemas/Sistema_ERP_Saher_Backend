import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Bitácora de las veces que un administrador autorizó (con usuario y contraseña) facturar
// un pedido a pesar de rebasar el límite de crédito del cliente.
// Se guarda dentro de la misma transacción de la factura: si la factura no se crea, tampoco esto.
// Sin llaves foráneas a propósito: es un registro de auditoría que debe sobrevivir a cualquier cambio.
@Table({ tableName: 'autorizacion_credito' })
export default class Autorizacion_Credito extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_autorizacion_credito: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_pedido_alm: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_factura: string | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_cxc: string | null;

    // Cliente al que quedó la deuda (el cliente real, si se eligió otro en la pantalla)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_cliente_alm: string;

    // Quién puso su usuario y contraseña
    @Column({ type: DataType.STRING(100), allowNull: false })
    declare usuario_autoriza: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_usuario_autoriza: string | null;

    // Quién estaba facturando (empleado de la sesión)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_solicita: string | null;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare limite_credito: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare adeudo_previo: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto_documento: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare excedente: number;
}
