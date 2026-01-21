import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, BelongsTo, HasMany, Unique } from "sequelize-typescript";
import Permiso_Rol from "./Permiso_Rol"; 


@Table({
        tableName: 'permiso'
})
     class Permiso extends Model{

        @PrimaryKey
        @Column({
            type: DataType.SMALLINT
        })
        declare id_permiso: number;

        @Column({
            type: DataType.STRING(20)
        })
        declare modulo_permiso: string;

        @Column({
            type: DataType.STRING
        })
        declare accion_permiso: string; 
     
        @HasMany(() => Permiso_Rol)
        declare permisosRol: Permiso_Rol[];
    }  
    export default Permiso;