import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, BelongsTo, HasMany, Unique } from "sequelize-typescript";
import Permiso_Rol from "./Permiso_Rol"; 


@Table({
    tableName: 'rol'
})
class Rol extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    declare id_rol: number;

    @Column({
        type: DataType.STRING(50)
    })
    declare nom_rol: string;

    @Column({
        type: DataType.SMALLINT
    })
    declare prioridad: number;

    @HasMany(() => Permiso_Rol)
    declare permisosRol: Permiso_Rol[];

}
export default Rol;