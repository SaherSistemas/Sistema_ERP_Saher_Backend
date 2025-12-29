import { Table, Column, Model, PrimaryKey, ForeignKey, DataType, BelongsTo, Default } from 'sequelize-typescript';

import Pedido_Almacen from './Pedido_Almacen';
import Articulo from '../../../models/Articulos/Articulo';
import Detalle_Pedido_Almacen from './Detalle_Pedido_Almacen';
import LoteArticuloSucursal from '../../../models/LotesYCaducidad/Lote_ArticuloSucursal';


@Table({
    tableName: 'detalle_pedido_almacen_lote',
    timestamps: false
})
class Detalle_Pedido_Almacen_Lote extends Model {
    @PrimaryKey
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen_lote: string;

    @ForeignKey(() => Detalle_Pedido_Almacen)
    @Column(DataType.UUID)
    declare id_detalle_pedido_almacen: string;

    @ForeignKey(() => LoteArticuloSucursal)
    @Column(DataType.UUID)
    declare id_lote_sucursal: string;

    @Column(DataType.SMALLINT)
    declare cantidad: number;

    @BelongsTo(() => Detalle_Pedido_Almacen)
    detalle_pedido_almacen: Detalle_Pedido_Almacen;

    @BelongsTo(() => LoteArticuloSucursal)
    lote_articulo_sucursal: LoteArticuloSucursal;
}

export default Detalle_Pedido_Almacen_Lote;
