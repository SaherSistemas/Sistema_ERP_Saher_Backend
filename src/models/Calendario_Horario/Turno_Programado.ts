import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Calendario_Horario from "./Periodo_Calendario";
import Rol from "../Usuarios/Rol";


@Table({
    tableName: "turno_programado"
})

class Turno_Programado extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_turno'
    })
    id_turno!: string;

    @ForeignKey(() => Calendario_Horario)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_periodo'
    })
    id_periodo!: string;

    @BelongsTo(() => Calendario_Horario, 'id_periodo')
    periodo_calendario!: Calendario_Horario;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'fecha'
    })
    fecha!: Date;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'hora_inicio'
    })
    hora_inicio!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'hora_fin'
    })
    hora_fin!: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_sucursal'
    })
    id_sucursal!: string;

    @BelongsTo(() => Empresa_Sucursal, 'id_sucursal')
    sucursal!: Empresa_Sucursal;

    @ForeignKey(() => Rol)
    @Column({
        type: DataType.SMALLINT,
        allowNull: false,
        field: 'rol_requerido'
    })
    rol_requerido!: number;
    @BelongsTo(() => Rol, 'rol_requerido')
    rol!: Rol;

    @Column({
        type: DataType.ENUM('vacante', 'asignado', 'cancelado'),
        allowNull: false,
        field: 'estado'
    })
    estado!: 'vacante' | 'asignado' | 'cancelado';

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'observaciones'
    })
    observaciones?: string;

}
export default Turno_Programado;