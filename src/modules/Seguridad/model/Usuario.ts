import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, Unique, Default } from 'sequelize-typescript';
import Empleado from '../../RRHH/model/Empleado';
import Rol from './Rol';
import { column } from 'mathjs';

@Table({
    tableName: 'usuario',
})
class Usuario extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_user: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID
    })
    declare id_referencia_persona: string

    @Unique
    @Column({
        type: DataType.STRING(20),
    })
    declare username: string;

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
    })
    declare password_user: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare status_user: boolean;

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.SMALLINT,
    })
    declare idrol_user: number;

    @BelongsTo(() => Empleado)
    declare empleado: Empleado;

    @BelongsTo(() => Rol)
    declare rol: Rol;
}

export default Usuario