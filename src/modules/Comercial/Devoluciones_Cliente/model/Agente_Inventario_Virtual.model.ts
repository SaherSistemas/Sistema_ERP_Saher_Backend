import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull } from 'sequelize-typescript';

/**
 * Inventario virtual del agente.
 *
 * Mercancía de una devolución de cliente ya aprobada (efectos financieros aplicados) que
 * NO llegó físicamente al almacén: la tiene el agente. No es stock disponible (no vive en
 * stock_ubicacion_lote), por eso no se puede surtir ni aparece en existencias.
 *
 * Cuando el agente la entrega, "Recibir en almacén" la convierte en stock SIN UBICACIÓN
 * (pendiente de acomodo) con su movimiento de Kardex.
 *
 * ESTATUS: EN_AGENTE → RECIBIDO
 */
@Table({ tableName: 'agente_inventario_virtual', timestamps: true })
export class Agente_Inventario_Virtual extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_inventario_virtual: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_agente: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_devolucion_cliente: string;

    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_articulo: string | null;

    /** Lote con el que salió en el pedido original (null si no se pudo determinar) */
    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_lote: string | null;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare descripcion_articulo: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad: number;

    @AllowNull(true)
    @Column(DataType.STRING(25))
    declare folio_factura: string | null;

    /** EN_AGENTE | RECIBIDO */
    @Default('EN_AGENTE')
    @Column({ type: DataType.STRING(12), allowNull: false })
    declare estatus: string;

    @AllowNull(true)
    @Column(DataType.DATE)
    declare fecha_recibido: Date | null;

    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_empleado_recibe: string | null;
}

export default Agente_Inventario_Virtual;
