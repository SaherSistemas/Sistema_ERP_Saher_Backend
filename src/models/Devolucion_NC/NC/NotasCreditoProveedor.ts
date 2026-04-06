import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo, HasMany } from 'sequelize-typescript';
import Compra_Proveedor from '../../../modules/Compras/Ordenes-Compra/model/Compra_Proveedor';
import Faltante_Factura_Proveedor from '../Faltante/Faltante_Factura_Proveedor';


@Table({
    tableName: 'notas_credito_proveedor',
    timestamps: true,
})
class NotasCreditoProveedor extends Model {
    // 'P' = pendiente entrada inventario, 'C' = cerrada (entrada ya dada)
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

    @Default('P')
    @Column({
        type: DataType.CHAR(1),
        allowNull: false,
    })
    declare estado_nc: string;

    @BelongsTo(() => Compra_Proveedor)
    compraProveedor: Compra_Proveedor;

    @HasMany(() => Faltante_Factura_Proveedor)
    declare faltantes?: Faltante_Factura_Proveedor[];

}

export default NotasCreditoProveedor;
