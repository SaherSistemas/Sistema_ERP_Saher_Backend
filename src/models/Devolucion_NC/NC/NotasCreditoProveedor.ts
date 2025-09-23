import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Compra_Proveedor from '../../Compra/Compra_Proveedor';


@Table({
    tableName: 'notas_credito_proveedor',
    timestamps: true,
})
class NotasCreditoProveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_nc: string;

    @ForeignKey(() => Compra_Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_compra_proveedor: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    declare folio_nc: string;

    @Column({
        type: DataType.TEXT
    })
    declare motivo_nc: string

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare fecha_emision: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare total_nc: number;

    @BelongsTo(() => Compra_Proveedor)
    compraProveedor: Compra_Proveedor;

}

export default NotasCreditoProveedor;
