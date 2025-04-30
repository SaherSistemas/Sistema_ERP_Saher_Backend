import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import Proveedor from "./Proveedor";
import Empresa from "../Empresa_Sucursal/Empresa_Sucursal";

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

    @ForeignKey(() => Empresa)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empre: string;

    @BelongsTo(() => Proveedor)
    proveedor: Proveedor;

    @BelongsTo(() => Empresa)
    empresa: Empresa;
}

export default Proveedor_Empresa;
