import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import LoteArticuloSucursal from './Lote_ArticuloSucursal';
import Detalle_Venta from '../Venta/Detalle_Venta';

@Table({
    tableName: "LoteUsadoVenta"
})

class LoteUsadoVenta extends Model {


    @PrimaryKey
    @Column({
        type: DataType.UUID
    })declare id_lote_usado:string;

    @ForeignKey(() => Detalle_Venta)
    @Column({
        type: DataType.UUID
    }) declare id_detalle_venta:string;
    @BelongsTo(() => Detalle_Venta)
    detalleVenta! : Detalle_Venta;


    @ForeignKey(() => LoteArticuloSucursal)
    @Column({
        type : DataType.UUID
    })declare  id_lote_sucursal :string;
    @BelongsTo(() => LoteArticuloSucursal)
    loteArticuloSucursal!: LoteArticuloSucursal;

    @Column({
        type : DataType.INTEGER
    })declare cantidad_utilizada:number;    
    
}
export default LoteUsadoVenta;