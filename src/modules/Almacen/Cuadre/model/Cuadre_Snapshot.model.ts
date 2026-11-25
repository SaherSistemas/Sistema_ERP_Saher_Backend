import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Una foto al día del cuadre de existencias, para ver si el descuadre sube o baja. Se guarda sola la primera vez
// que alguien abre la pantalla cada día (y se actualiza si se vuelve a calcular el mismo día).
@Table({
    tableName: 'cuadre_snapshot',
    indexes: [{ unique: true, fields: ['id_empresa_sucursal', 'fecha'] }],
})
export default class Cuadre_Snapshot extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_cuadre_snapshot: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare lotes_contar: number;

    // Suma de las diferencias (en valor absoluto) de los lotes por contar
    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare piezas_contar: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare lotes_explicables: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare lotes_cuadran: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare apartadas_sin_pedido: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare alertas_pendientes: number;
}
