import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Unique,
    Default,
    Index,
} from 'sequelize-typescript';
import Empleado from '../../RRHH/model/Empleado';
import Rol from './Rol';

@Table({
    tableName: 'usuario',
    indexes: [
        {
            name: 'idx_usuario_username',
            unique: true,
            fields: ['username'],
        },
    ],
})
class Usuario extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_user: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_referencia_persona: string;

    @Index('idx_usuario_username') // ← refuerza el índice a nivel columna
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

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
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

export default Usuario;
