import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, Unique } from 'sequelize-typescript';
import Empleado from './Empleado';
import Rol from './Rol';

@Table({
    tableName: 'usuario',
    timestamps: false,
})
class Usuario extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_usuario: string;

    @Unique
    @Column({
        type: DataType.STRING(10),
    })
    declare username: string;

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

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare idrol_user: string;

    @BelongsTo(() => Empleado)
    declare empleado: Empleado;

    @BelongsTo(() => Rol)
    declare rol: Rol;
}

export default Usuario