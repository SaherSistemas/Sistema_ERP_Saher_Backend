import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";

@Table({
    tableName: 'rol'
})
class Rol extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_rol: string;

    @Column({
        type: DataType.STRING(50)
    })
    declare nom_rol: string;
}
export default Rol;