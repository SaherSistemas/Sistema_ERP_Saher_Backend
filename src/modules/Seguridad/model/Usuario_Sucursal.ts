import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, Unique, Default } from 'sequelize-typescript';
import Empleado from '../../RRHH/model/Empleado';
import Rol from './Rol';

@Table({
    tableName: 'usuario_empresa',
})
class Usuario extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_user_empresa: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID
    })
    declare id_empresa: string


    @Column({
        type: DataType.BOOLEAN,
    })
    declare status_acceso: boolean;


}

export default Usuario