import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Bitácora de cancelaciones de vales (completos o de un solo artículo): quién, cuánto, por qué y qué pasó con la existencia.
// Sin llaves foráneas a propósito: es un registro de auditoría que debe sobrevivir aunque el renglón o el vale cambien.
@Table({ tableName: 'vale_cancelacion' })
export default class Vale_Cancelacion extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_vale_cancelacion: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_pedido_alm: string;

    @Column({ type: DataType.STRING(80), allowNull: true })
    declare cod_vale: string | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_vale: string | null;

    // VALE = se canceló todo el vale · RENGLON = solo un artículo
    @Column({ type: DataType.STRING(10), allowNull: false })
    declare alcance: 'VALE' | 'RENGLON';

    @Column({ type: DataType.STRING(5), allowNull: false })
    declare status_anterior: string;

    // Renglón cancelado (alcance RENGLON): se guarda el dato, no la referencia, porque el renglón se elimina
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_articulo: string | null;

    @Column({ type: DataType.STRING(250), allowNull: true })
    declare descripcion_articulo: string | null;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
    declare cantidad: number | null;

    // Importe que se le quitó a la deuda del empleado (con IVA)
    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare monto: number;

    // EXISTENCIA = la mercancía ya había salido y se regresó al stock (sin ubicar) · APARTADO = solo se liberó lo apartado · NINGUNO
    @Column({ type: DataType.STRING(12), allowNull: false, defaultValue: 'NINGUNO' })
    declare stock: 'EXISTENCIA' | 'APARTADO' | 'NINGUNO';

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare piezas_regresadas: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare motivo: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_usuario: string | null;

    @Column({ type: DataType.STRING(150), allowNull: true })
    declare cancelado_por: string | null;
}
