import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";
import Estado from "./Estado";
import Proveedor from "../Proveedor/Proveedor";
import Empleado from "../Usuarios/Empleado";

@Table({
    tableName: 'ciudad'
})
class Ciudad extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID
    })
    declare id_ciuda: string;

    @Unique
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare id_intciuda: number;

    @ForeignKey(() => Estado)
    @Column({
        type: DataType.UUID,
        field: "id_esta_ciuda" // Asegúrate que en la base esté así
    })
    declare id_esta_ciuda: string;

    @Unique
    @Column({
        type: DataType.STRING(100)
    })
    declare nom_ciuda: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    declare activo_ciuda: boolean;

    @BelongsTo(() => Estado)
    estado: Estado;

    @HasMany(() => Proveedor)
    proveedores: Proveedor[];

    @HasMany(() => Empleado)
    empleados: Empleado[];
}

export default Ciudad;
