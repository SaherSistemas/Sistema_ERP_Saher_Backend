import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

/**
 * Devolución al proveedor de mercancía YA recibida (factura chequeada o cerrada): por ejemplo, un artículo que se
 * descubre próximo a caducar. Al crearla salen las piezas del inventario, se crea la nota de crédito PENDIENTE
 * y la factura pasa a "Con devolución". El detalle está en \`devolucion_proveedor_detalle\`.
 */
@Table({ tableName: 'devolucion_proveedor', timestamps: true })
export class Devolucion_Proveedor extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_devolucion_proveedor: string;

    @Column({ type: DataType.STRING(40), allowNull: false })
    declare folio_devolucion: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura_proveedor: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_nc: string | null;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa: string;

    @Column({ type: DataType.STRING(60), allowNull: false })
    declare motivo: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare observaciones: string | null;

    /** Sin IVA */
    @Column({ type: DataType.DECIMAL(14, 2), allowNull: false })
    declare subtotal: number;

    @Column({ type: DataType.DECIMAL(14, 2), allowNull: false })
    declare iva: number;

    @Column({ type: DataType.DECIMAL(14, 2), allowNull: false })
    declare total: number;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado: string | null;

    @Column({ type: DataType.STRING(120), allowNull: true })
    declare usuario: string | null;
}

export default Devolucion_Proveedor;
