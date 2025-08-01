import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";
import Empresa_Sucursal from "./Empresa_Sucursal";

@Table({
    tableName: 'grupo_empresa'
})

class Grupo_Empresa extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_grup_empresa: string

    @Column({
        type: DataType.STRING(100)
    })
    declare nom_grup_empresa: string


    @HasMany(() => Empresa_Sucursal)
    empresaSucursal: Empresa_Sucursal;
}

export default Grupo_Empresa