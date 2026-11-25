import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Un "corte" del cuadre de existencias: foto de la existencia de cada lote en un momento dado. Sirve de punto de partida
// para detectar fugas: lo que hay hoy debe ser el corte + entradas − salidas posteriores. Sin llaves foráneas a propósito
// (registro de auditoría). La tabla la crea sola el servidor al arrancar.
@Table({ tableName: 'cuadre_corte' })
export default class Cuadre_Corte extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_cuadre_corte: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.STRING(120), allowNull: false })
    declare nombre: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    // Momento exacto del corte: los movimientos posteriores a esta fecha son los que se comparan
    @Column({ type: DataType.DATE, allowNull: false })
    declare fecha_corte: Date;

    @Column({ type: DataType.UUID, allowNull: true })
    declare creado_por: string | null;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare total_lotes: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare total_piezas: number;
}
