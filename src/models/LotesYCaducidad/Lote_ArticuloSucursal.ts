import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Articulo from "../Articulos/Articulo";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";

@Table ({
    tableName:"lote_sucursal_articulo"
})

class LoteArticuloSucursal extends Model{

    @PrimaryKey
    @Column({
        type:DataType.UUID
    })
    declare id_lote_sucursal: string;

    @ForeignKey(() => Articulo )
    @Column({
        type:DataType.UUID
    })
    declare id_artic : string;
    @BelongsTo(() => Articulo)
    articulo : Articulo;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID
    }) declare id_empre : string;
    @BelongsTo (() => Empresa_Sucursal)
    empresa : Empresa_Sucursal;

    @Column({
        type:DataType.STRING(50)
    }) declare numero_lote_sucursal: string;

    @Column({
        type: DataType.DATE
    })declare fecha_venci_lote_sucursal: Date;
    
    @Column({
        type : DataType.INTEGER
    }) declare cantidad_lote_sucursal: number;

    @Column({
        type: DataType.CHAR(1)
    }) declare estado_lote_sucursal: string;

}

export default LoteArticuloSucursal;