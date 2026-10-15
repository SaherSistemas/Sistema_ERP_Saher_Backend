import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

/**
 * Lote y caducidad capturados a mano para un artículo de una devolución de FACTURA ANTERIOR (sin pedido ni lotes).
 * Se guardan con la solicitud para que, al aprobarla después, la mercancía entre (o quede en el inventario virtual
 * del agente) con su lote y caducidad.
 */
@Table({ tableName: 'devolucion_cliente_lote_manual', timestamps: false })
export class Devolucion_Cliente_Lote_Manual extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_lote_manual: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_devolucion_cliente: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.STRING(50), allowNull: false })
    declare numero_lote: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha_caducidad: string;
}

export default Devolucion_Cliente_Lote_Manual;
