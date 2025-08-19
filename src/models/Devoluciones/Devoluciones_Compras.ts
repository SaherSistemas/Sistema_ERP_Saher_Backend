import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Compra_Proveedor from '../Compra/Compra_Proveedor';
import Factura_Compra_Proveedor from '../Proveedor/Factura_Compra_Proveedor';
import Empleado from '../Usuarios/Empleado';


@Table({
    tableName: 'devoluciones_compras',
    timestamps: true,
})
class Devoluciones_Compras extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_devo: string;

    @ForeignKey(() => Compra_Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_compr_prove: string;

    @ForeignKey(() => Factura_Compra_Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_factura: string;


    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare subtotal: number;

    @Column({
        type: DataType.DECIMAL(10, 2)
    })
    declare iva_total: number

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID
    })
    declare id_usuario_devolucio: string

    @BelongsTo(() => Compra_Proveedor)
    declare compraProvedor: Compra_Proveedor;

    @BelongsTo(() => Factura_Compra_Proveedor)
    declare factura_prove: Factura_Compra_Proveedor

}

export default Devoluciones_Compras;
