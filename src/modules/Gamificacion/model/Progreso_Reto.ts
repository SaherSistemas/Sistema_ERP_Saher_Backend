import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo, Default
} from 'sequelize-typescript';
import Reto from './Reto';
import Empleado from '../../RRHH/model/Empleado';

@Table({
    tableName: 'progreso_reto',
    timestamps: true,
    indexes: [
        {
            unique: true,
            name: 'unique_progreso_reto',
            fields: ['id_reto', 'id_empleado', 'periodo_ref'],
        },
    ],
})
class Progreso_Reto extends Model {
    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_progreso: string;

    @ForeignKey(() => Reto)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_reto: string;

    @BelongsTo(() => Reto)
    declare reto: Reto;

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empleado: string;

    @BelongsTo(() => Empleado)
    declare empleado: Empleado;

    /**
     * Para período CORTE → id del corte de caja (UUID como string)
     * Para período DIA  → fecha en formato YYYY-MM-DD
     */
    @Column({ type: DataType.STRING(50), allowNull: false })
    declare periodo_ref: string;

    @Default(0)
    @Column({ type: DataType.DECIMAL(12, 2) })
    declare progreso_actual: number;

    @Default(false)
    @Column({ type: DataType.BOOLEAN })
    declare completado: boolean;

    @Column({ type: DataType.DATE, allowNull: true })
    declare fecha_completado: Date | null;
}

export default Progreso_Reto;
