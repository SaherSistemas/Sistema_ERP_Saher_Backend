import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";
import Compra_Proveedor from "./Compra_Proveedor";

@Table({
    tableName: 'compra_general',
    timestamps: false
})
class Compra_General extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_compra_general: string

    @Unique
    @Column({
        type: DataType.STRING(100)
    })
    declare id_interno_compra_gen: string

    @Column({
        type: DataType.DATE
    })
    declare fecha_inicio: Date

    @Column({
        type: DataType.DATE
    })
    declare fecha_fin: Date

    @Column({
        type: DataType.CHAR(1)
    })
    declare estado_comp: string
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_compra_general: number


    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @Column({
        type: DataType.STRING(50)
    })
    declare ultimo_articulo_guardado: string

    @Column(DataType.STRING(25))
    declare tipo_compra: string



    @HasMany(() => Compra_Proveedor)
    compra_proveedor: Compra_Proveedor

    @BelongsTo(() => Empresa_Sucursal)
    empresa: Empresa_Sucursal


}

export default Compra_General;