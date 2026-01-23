import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import Proveedor from "./Proveedor";
import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";
@Table({
    tableName: 'proveedor_empresa'
})
class Proveedor_Empresa extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_proveemp: string;

    @ForeignKey(() => Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_prove: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empre: string;

    @BelongsTo(() => Proveedor)
    proveedor: Proveedor;

    @BelongsTo(() => Empresa_Sucursal)
    empresa: Empresa_Sucursal;
}

export default Proveedor_Empresa;
