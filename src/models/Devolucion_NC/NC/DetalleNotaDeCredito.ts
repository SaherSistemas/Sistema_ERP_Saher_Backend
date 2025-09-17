import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import NotasCreditoProveedor from './NotaDeCredito';
import Articulo from '../../Articulos/Articulo';


@Table({
    tableName: 'detalle_notas_credito',
    timestamps: true,
})
class DetalleNotaDeCredito extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_detalle_nc: string;

    @ForeignKey(() => NotasCreditoProveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_nc: string;

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_artic: string;

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad: number

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare precio_unit: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare iva_unit: number;

    @BelongsTo(() => NotasCreditoProveedor)
    notaCredito: NotasCreditoProveedor;

}

export default DetalleNotaDeCredito;
