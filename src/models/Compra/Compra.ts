import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Proveedor from "../Proveedor/Proveedor";
import Detalle_Compra_Solicitado from "./Detalle_Compra_Solicitado";

@Table({
    tableName: 'compra'
})
class Compra extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_comp: string

    @ForeignKey(() => Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare idprove_comp: string

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_comp: number

    @Column({
        type: DataType.CHAR(1)
    })
    declare estado_comp: string

    @BelongsTo(() => Proveedor)
    proveedor: Proveedor;

    @HasMany(() => Detalle_Compra_Solicitado)
    declare detallesCompra: Detalle_Compra_Solicitado[];
}

export default Compra;