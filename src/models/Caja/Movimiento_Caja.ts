import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Metodo_de_Pago from "./Metodo_de_Pago";

@Table({
    tableName: "movimiento_caja"
})
    
class Movimiento_Caja extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_movimiento: string;

 
    @ForeignKey(() => Metodo_de_Pago)
    @Column({
        type: DataType.UUID,
        //defaultValue: DataType.UUIDV4,
    })
    declare id_metodo_pago: string;

    @Column({
        type: DataType.STRING(30),
    })
    declare tipo_movimiento: string; // 'entrada' | 'salida'

    @Column({
        type: DataType.STRING(15),
    })
    declare concepto_movimiento: string; // 'venta' | 'compra' | 'gasto' | etc.

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_movimiento: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    declare referencia_pago?: string;

    @Column({
        type: DataType.UUID,
    })
    declare id_usuario: string;


    @BelongsTo(() => Metodo_de_Pago)
    metodo_pago: Metodo_de_Pago;  
}

export default Movimiento_Caja;