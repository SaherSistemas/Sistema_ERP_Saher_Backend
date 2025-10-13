import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";

import Turno_Programado from "./Turno_Programado";
import Empleado from "../Usuarios/Empleado/Empleado";


@Table({
    tableName: "asignacion_turno"
})

class Asignacion_Turno extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_asignacion'
    })
    id_asignacion!: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_empleado'
    })
    id_empleado!: string;
    @BelongsTo(() => Empleado, 'id_empleado')
    empleadoAsignado!: Empleado;

    @ForeignKey(() => Turno_Programado)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_turno'
    })
    id_turno!: string; // qué turno cubre 
    @BelongsTo(() => Turno_Programado, 'id_turno')
    turno!: Turno_Programado;


    @Column({
        type: DataType.ENUM('asignado', 'reemplazado', 'ausente', 'completado'),
        allowNull: false,
        field: 'estado'
    })
    estado!: 'asignado' | 'reemplazado' | 'ausente' | 'completado';

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'creado_por'
    })
    creado_por!: string;
    @BelongsTo(() => Empleado, 'creado_por')
    creadoPor!: Empleado;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'fecha_asignacion'
    })
    fecha_asignacion!: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'observaciones'
    })
    observaciones?: string;

}

export default Asignacion_Turno;
