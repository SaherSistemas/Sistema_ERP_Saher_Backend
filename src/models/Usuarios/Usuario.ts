import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Empleado from './Empleado';

@Table({
    tableName: 'usuario',
    timestamps: false,
})
class Usuario extends Model {
    @PrimaryKey
    @Column({
        type: DataType.STRING(10),
    })
    declare userName: string;

    @Column({
        type: DataType.STRING(30),
        allowNull: false,
    })
    declare password_user: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare idEmpleado_user: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare status_user: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare fechaCaducCont_user: Date;

    @BelongsTo(() => Empleado)
    declare empleado: Empleado;
}

export default Usuario