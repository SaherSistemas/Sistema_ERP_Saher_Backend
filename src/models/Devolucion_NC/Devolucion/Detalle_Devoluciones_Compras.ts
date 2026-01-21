import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Devoluciones_Compras from './Devoluciones_Compras';
import Articulo from '../../../modules/Inventario/Articulos/model/Articulo';


@Table({
    tableName: 'detalle_devoluciones_compras',
    timestamps: true,
})
class Detalle_Devoluciones_Compras extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_detalledevo: string;

    @ForeignKey(() => Devoluciones_Compras)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_devo: string;

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_articulo: string;



    @Column({
        type: DataType.SMALLINT,
        allowNull: false,
    })
    declare cantidad: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare costo_unitario: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare iva_unitario: number;

    @Column({
        type: DataType.TEXT
    })
    declare motivo: string

    @Column({
        type: DataType.TEXT
    })
    declare lote: string

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_caducidad: string


    @BelongsTo(() => Devoluciones_Compras)
    declare devolucionesCompra: Devoluciones_Compras;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo

}

export default Detalle_Devoluciones_Compras;
