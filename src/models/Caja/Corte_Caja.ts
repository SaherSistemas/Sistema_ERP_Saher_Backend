import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Caja from "./Caja"; 

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

    // @ForeignKey(() => usuario)
    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_apertura: string;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_apertura: Date;

    @Column({
        type: DataType.UUID,
    })
    declare id_usuario_cierre: string;

    @Column({
        type: DataType.DATE,
    })
    declare fecha_cierre: Date;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare monto_final: string;

    @Column({
        type: DataType.BOOLEAN,
    })
    declare estado_corte: boolean;
}
export default CorteCaja;