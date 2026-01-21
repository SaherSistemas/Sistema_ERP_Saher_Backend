import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, BelongsToMany } from "sequelize-typescript";
import Empleado from "../../modules/RRHH/model/Empleado";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";


@Table({
    tableName: "asignacion_empleado_sucursal"
})

class Asignacion_Empleado_Sucursal extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_asignacion: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_empleado: string;
    @BelongsTo(() => Empleado)
    declare empleado: Empleado;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
    })
    declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    declare sucursal: Empresa_Sucursal;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_inicio: Date;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_fin: Date;

    @Column({
        type: DataType.ENUM("FIJO", "TEMPORAL", "COBERTURA"),
    })
    declare tipo: "FIJO" | "TEMPORAL" | "COBERTURA";

    @Column({
        type: DataType.ENUM("AM", "PM", "COMPLETO"),
        allowNull: false,
        defaultValue: "COMPLETO",
    })
    declare turno: "AM" | "PM";

    @Column({
        type: DataType.STRING,
    })
    declare motivo: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
    })
    declare activo: boolean;

}
export default Asignacion_Empleado_Sucursal;