import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Existencia de un lote en el momento de un corte (ver Cuadre_Corte). Un renglón por lote con existencia o apartada.
@Table({
    tableName: 'cuadre_corte_lote',
    timestamps: false,
    indexes: [{ unique: true, fields: ['id_cuadre_corte', 'id_lote'] }],
})
export default class Cuadre_Corte_Lote extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_cuadre_corte_lote: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_cuadre_corte: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_lote: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare cantidad: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare apartada: number;
}
