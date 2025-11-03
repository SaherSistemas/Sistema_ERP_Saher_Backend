import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, BelongsToMany } from "sequelize-typescript";
import Presupuesto_empresa from "./Presupuesto_Empresa";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Empleado from "../Usuarios/Empleado/Empleado";


@Table({
    tableName: "movimiento_presupuesto"
})

class Movimiento_Presupuesto extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_movimiento: string;

    @ForeignKey(() => Presupuesto_empresa)
    @Column({
        type: DataType.UUID,
    })
    declare id_presupuesto: string;
    @BelongsTo(() => Presupuesto_empresa)
    declare presupuesto_empresa: Presupuesto_empresa;

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
    declare empresa_sucursal: Empresa_Sucursal;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_movimiento: Date;

    @Column({
        type: DataType.ENUM('COBERTURA', 'RECALCULO', 'AJUSTE', 'CREACION', 'OTRO'),
    })
    declare tipo: 'COBERTURA' | 'RECALCULO' | 'AJUSTE' | 'CREACION' | 'OTRO';

    @Column({
        type: DataType.STRING,
    })
    declare descripcion?: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare valor_anterior: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
    })
    declare valor_nuevo: number;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare usuario_modifico: string;

}
export default Movimiento_Presupuesto;