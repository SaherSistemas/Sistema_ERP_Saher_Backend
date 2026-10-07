import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

// Días máximos que tarda un proveedor en entregar una orden, contados desde que se le envió. Pasado ese plazo sin que se
// reciba, la orden se marca como Vencida (V) y deja de contar como "en camino". Una fila con id_prove en ceros
// (00000000-0000-0000-0000-000000000000) guarda el plazo GENERAL para los proveedores sin plazo propio.
// Va en su propia tabla (que el servidor crea sola al arrancar) para no alterar la de proveedores.
@Table({
    tableName: 'proveedor_dias_entrega',
    timestamps: false,
})
class Proveedor_Dias_Entrega extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_prove: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare dias: number;
}

export default Proveedor_Dias_Entrega;
