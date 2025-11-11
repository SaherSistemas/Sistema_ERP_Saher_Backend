import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, BelongsToMany, HasMany } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Presupuesto_Empleado from "./Presupuesto_Empleado";

@Table({
    tableName: "presupuesto_empresa"
})

class Presupuesto_empresa extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_presupuesto: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
    })
    declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal;

    @Column({
        type: DataType.SMALLINT,
    })
    declare anio: number;

    @Column({
        type: DataType.SMALLINT,
    })
    declare mes: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare monto_total: number;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare turnos_planeados: number;

    @Column({
        type: DataType.INTEGER,
    })
    declare turnos_reales?: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare monto_por_turno?: number;

    @Default("PLANIFICADO")
    @Column({
        type: DataType.ENUM('PLANIFICADO', 'EJECUCION', 'CERRADO'),
    })
    declare estado_presupuesto: 'PLANIFICADO' | 'EJECUCION' | 'CERRADO';

    @Column({
        type: DataType.DATE,
    })
    declare fecha_cierre?: Date;

    @HasMany(() => Presupuesto_Empleado)
    declare presupuesto_empleados?: Presupuesto_Empleado[];

    //  @HasMany(() => Movimiento_Presupuesto)
    // declare movimiento_presupuesto?: Movimiento_Presupuesto[];
}
export default Presupuesto_empresa;
