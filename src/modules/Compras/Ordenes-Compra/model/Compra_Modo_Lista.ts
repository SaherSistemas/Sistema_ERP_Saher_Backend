import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

// Qué lista de artículos debe mostrar la compra ESPECIAL en captura de una empresa. Por ahora solo
// DIAS_INVENTARIO: la lista de agotados / críticos / bajos del Tablero de Almacén (con la ventana de ventas en `dias`).
// Va en su propia tabla (que el servidor crea sola al arrancar) para no alterar compra_general.
// Se amarra a la compra (id_compra_general) la primera vez que esa compra ESPECIAL se consulta; si después hay otra
// compra distinta, este renglón ya no aplica. Un renglón sin compra amarrada caduca a las 12 horas.
@Table({
    tableName: 'compra_modo_lista',
    timestamps: true,
})
class Compra_Modo_Lista extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.STRING(30), allowNull: false })
    declare modo: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
    declare dias: number;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_compra_general: string | null;
}

export default Compra_Modo_Lista;
