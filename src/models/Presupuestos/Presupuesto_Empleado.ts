import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, BelongsToMany, HasMany } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Presupuesto_Empresa from "./Presupuesto_Empresa";
import Empleado from "../../modules/RRHH/model/Empleado";

@Table({
    tableName: "presupuesto_empleado"
})

class Presupuesto_Empleado extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_presupuesto_empleado: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
    })
    declare id_empre: string;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_sucursal?: Empresa_Sucursal;

    @ForeignKey(() => Presupuesto_Empresa)
    @Column({
        type: DataType.UUID,
    })
    declare id_presupuesto: string;
    @BelongsTo(() => Presupuesto_Empresa)
    declare presupuesto?: Presupuesto_Empresa;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_empleado: string;
    @BelongsTo(() => Empleado)
    declare empleado?: Empleado;

    @Column({
        type: DataType.INTEGER,
    })
    declare turnos_planeado: number;

    @Column({
        type: DataType.INTEGER,
    })
    declare turnos_reales?: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare monto_planeado: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare monto_real?: number;


}
export default Presupuesto_Empleado;