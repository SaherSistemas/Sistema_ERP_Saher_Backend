import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo
} from 'sequelize-typescript';
import Reto from './Reto';
import Empleado from '../../RRHH/model/Empleado';

@Table({ tableName: 'logro_empleado', timestamps: true })
class Logro_Empleado extends Model {
    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_logro: string;

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

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare puntos_ganados: number;

    /** id del corte o fecha, igual que en Progreso_Reto */
    @Column({ type: DataType.STRING(50), allowNull: true })
    declare periodo_ref: string | null;

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    declare fecha_logro: Date;
}

export default Logro_Empleado;
