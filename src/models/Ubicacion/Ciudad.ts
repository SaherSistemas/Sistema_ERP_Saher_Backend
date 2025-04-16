import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Estado from "./Estado";
import Proveedor from "../Proveedor/Proveedor";
import Empleado from "../Usuarios/Empleado";

@Table({
    tableName: 'ciudad'
})

class Ciudad extends Model {
    @PrimaryKey
    @Column({
        type: DataType.SMALLINT
    })
    declare id_ciuda: number

    @ForeignKey(() => Estado)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_esta_ciuda: number

    @Unique
    @Column({
        type: DataType.STRING()
    })
    declare nom_ciuda: string

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare activo_ciuda: boolean

    @BelongsTo(() => Estado)
    estado: Estado

    // Relación: Una ciudad tiene muchos proveedores
    @HasMany(() => Proveedor)
    proveedores: Proveedor[];

    //RELACION UNA CIUDAD TIENE MUCHOS EMPLEADOS
    @HasMany(() => Empleado)
    empleados: Empleado[];
}

export default Ciudad