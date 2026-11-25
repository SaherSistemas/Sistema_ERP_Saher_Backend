import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Avisos del "Cuadre de existencias": se genera uno cuando, al facturar un pedido, la existencia del sistema era menor
// que lo que se facturó (no se pudo descontar todo). Sin llaves foráneas a propósito: es un registro de auditoría.
// La tabla la crea sola el servidor al arrancar.
@Table({ tableName: 'cuadre_alerta' })
export default class Cuadre_Alerta extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_cuadre_alerta: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_pedido_alm: string | null;

    @Column({ type: DataType.STRING(60), allowNull: true })
    declare cod_pedido: string | null;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_lote: string;

    // Piezas que se facturaron del lote, las que sí se pudieron descontar y las que faltaron
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare facturado: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare descontado: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare faltante: number;

    @Column({ type: DataType.STRING(40), allowNull: false, defaultValue: 'FALTANTE_AL_FACTURAR' })
    declare tipo: string;

    // Cuando alguien ya la revisó
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    declare atendida: boolean;

    @Column({ type: DataType.DATE, allowNull: true })
    declare atendida_en: Date | null;

    @Column({ type: DataType.UUID, allowNull: true })
    declare atendida_por: string | null;
}
