import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Caja from "./Caja"; 
import Empleado from "../Usuarios/Empleado";

@Table({
    tableName: "corte_caja"
})  

class CorteCaja extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_corte: string;

    @ForeignKey(() => Caja)
    @Column({
        type: DataType.UUID,
    })
    declare id_caja: string;
    @BelongsTo(() => Caja)
    idcaja: Caja;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_apertura: string;
    @BelongsTo(() => Empleado, 'id_usuario_apertura')
    empleado_apertura: Empleado;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_apertura: Date;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_cierre: string;
    @BelongsTo(() => Empleado, 'id_usuario_cierre')
    empleado_cierre: Empleado;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_cierre: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_final: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare total_venta: number;
    

    @Column({
        type: DataType.BOOLEAN,
    })
    declare status_corte: boolean;
}
export default CorteCaja;