import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Solicitud que el checador manda a los administradores para poder facturar un pedido:
//   CREDITO → el cliente rebasa su límite de crédito
//   PRECIOS → hay artículos con un precio mayor al capturado en el pedido
// Estatus: PEN pendiente · AUT autorizada · REC rechazada · CAN cancelada por quien la pidió
//          USA ya se usó (crédito: la factura se timbró con esta autorización)
// Sin llaves foráneas a propósito: es un registro de auditoría que debe sobrevivir a cualquier cambio.
@Table({ tableName: 'solicitud_autorizacion' })
export default class Solicitud_Autorizacion extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_solicitud_autorizacion: string;

    @Column({ type: DataType.STRING(10), allowNull: false })
    declare tipo: 'CREDITO' | 'PRECIOS';

    @Column({ type: DataType.STRING(5), allowNull: false, defaultValue: 'PEN' })
    declare estatus: 'PEN' | 'AUT' | 'REC' | 'CAN' | 'USA';

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_pedido_alm: string;

    @Column({ type: DataType.STRING(80), allowNull: true })
    declare cod_pedido: string | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_cliente_alm: string | null;

    @Column({ type: DataType.STRING(250), allowNull: true })
    declare cliente_nombre: string | null;

    // CREDITO: { limite, adeudo_actual, monto_factura, adeudo_resultante, excedente }
    // PRECIOS: { lineas: [{ id_detalle_pedido_almacen, des_artic, cant_pedida, precio_pedido, precio_actual, diferencia }], totales }
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    declare datos: Record<string, any>;

    // Quién pidió la autorización (el checador)
    @Column({ type: DataType.STRING(150), allowNull: true })
    declare solicita_nombre: string | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_solicita: string | null;

    // Quién la resolvió y desde dónde (WEB = sesión de administrador · ESCRITORIO = usuario y contraseña en la app)
    @Column({ type: DataType.STRING(150), allowNull: true })
    declare resuelto_por: string | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_usuario_resuelve: string | null;

    @Column({ type: DataType.STRING(10), allowNull: true })
    declare resuelto_via: 'WEB' | 'ESCRITORIO' | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare motivo_resolucion: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare fecha_resolucion: Date | null;
}
