import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, BelongsTo, HasMany, Unique } from "sequelize-typescript";
import Rol from "./Rol"
import Permiso from "./Permiso"

@Table({
    tableName: 'permiso_rol'
})
class Permiso_Rol extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_rol_permiso: string;


    @ForeignKey(() => Permiso)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_permiso: number;
    @BelongsTo(() => Permiso)
    declare permiso: Permiso;

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_rol: number;
    @BelongsTo(() => Rol)
    declare rol: Rol;


}
export default Permiso_Rol;