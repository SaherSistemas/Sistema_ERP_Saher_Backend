import { Table, Column, Model, PrimaryKey, ForeignKey, DataType, BelongsTo, Default } from 'sequelize-typescript';
import LoteArticuloSucursal from '../../../../models/LotesYCaducidad/Lote_ArticuloSucursal';
import Ubicacion_Sucursal from './Ubicacion_Sucursal';


@Table({
    tableName: 'lote_articulo_sucursal_ubicacion'
})
class Lote_Articulo_Sucursal_Ubicacion extends Model {
    @PrimaryKey
    @Column(DataType.UUID)
    declare id_lote_articulo_sucursal_ubicacion: string;

    @ForeignKey(() => LoteArticuloSucursal)
    @Column(DataType.UUID)
    declare id_lote: string;

    @ForeignKey(() => Ubicacion_Sucursal)
    @Column(DataType.UUID)
    declare id_ubicacion_sucursal: string;


    @Column(DataType.INTEGER)
    declare cantidad: number;

    @Column(DataType.INTEGER)
    declare cantidad_apartada: number;




    @BelongsTo(() => Ubicacion_Sucursal)
    ubicacion_sucursal: Ubicacion_Sucursal;


    @BelongsTo(() => LoteArticuloSucursal)
    lote_articulo_sucursal: LoteArticuloSucursal;
}

export default Lote_Articulo_Sucursal_Ubicacion;
