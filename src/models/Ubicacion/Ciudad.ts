import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";
import Estado from "./Estado";
import Empleado from "../../modules/RRHH/model/Empleado";
import Colonia from "./Colonia";

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
        type: DataType.UUID
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


    @HasMany(() => Empleado)
    empleados: Empleado[];

    @HasMany(() => Colonia)
    colonias: Colonia[];
}

export default Ciudad;
