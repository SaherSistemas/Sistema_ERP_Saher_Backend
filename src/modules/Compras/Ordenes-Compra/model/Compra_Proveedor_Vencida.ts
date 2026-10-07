import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

// Bitácora de las órdenes a proveedor que se marcaron como Vencidas (V) por no recibirse a tiempo: en qué estatus estaban,
// cuándo vencieron, con cuántos días de plazo y, si se reactivaron, cuándo (el plazo vuelve a contar desde ahí).
// Va en su propia tabla (que el servidor crea sola al arrancar) para no alterar compra_proveedor.
@Table({
    tableName: 'compra_proveedor_vencida',
    timestamps: false,
})
class Compra_Proveedor_Vencida extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_comp: string;

    @Column({ type: DataType.CHAR(1), allowNull: false, defaultValue: 'E' })
    declare estado_anterior: string;

    @Column({ type: DataType.DATE, allowNull: false })
    declare vencida_en: Date;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare dias_aplicados: number;

    @Column({ type: DataType.DATE, allowNull: true })
    declare reactivada_en: Date | null;
}

export default Compra_Proveedor_Vencida;
