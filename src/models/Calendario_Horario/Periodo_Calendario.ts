import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasMany } from "sequelize-typescript";
import Empleado from "../Usuarios/Empleado";
import Turno_Programado from "./Turno_Programado";


@Table({
    tableName: "periodo_calendario"
})  

class Calendario_Horario extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id_periodo'
    })
    id_periodo!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'anio'
    })
    anio!: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'mes'
    })
    mes!: number;

    @Column({
        type: DataType.ENUM('borrador', 'activo', 'cerrado'),
        allowNull: false,
        field: 'estado'
    })
    estado!: 'borrador' | 'activo' | 'cerrado';


    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'creado_por'
    })
    creado_por!: string;
    @BelongsTo(() => Empleado, 'creado_por')
    empleado!: Empleado;


    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'fecha_cierre'
    })
    fecha_cierre?: Date;



    @HasMany(() => Turno_Programado, {
         as: 'turnos', 
         foreignKey: 'id_periodo',
         onDelete: 'CASCADE' })
    turnos!: Turno_Programado[];

}

export default Calendario_Horario;