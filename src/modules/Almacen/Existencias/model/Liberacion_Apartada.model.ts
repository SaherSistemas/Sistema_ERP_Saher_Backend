import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Bitácora de las veces que alguien liberó a mano piezas apartadas que ningún pedido activo respaldaba
// (Almacén → Existencias por Ubicación). Sin llaves foráneas a propósito: es un registro de auditoría.
@Table({ tableName: 'liberacion_apartada' })
export default class Liberacion_Apartada extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_liberacion_apartada: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_lote: string;

    // Piezas que se liberaron
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad_liberada: number;

    // Cuánto había apartado y cuánto respaldaban pedidos activos al momento de liberar
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare apartada_antes: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare respaldo_pedidos: number;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado: string | null;
}
