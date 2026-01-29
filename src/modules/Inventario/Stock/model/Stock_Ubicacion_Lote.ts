// src/modules/Inventario/Stock_Ubicacion_Lote/model/Stock_Ubicacion_Lote.ts
import {
    Table, Column, Model, PrimaryKey, DataType, Default,
    ForeignKey, BelongsTo, Index
} from "sequelize-typescript";
import Ubicacion_Sucursal from "../../Ubicaciones/model/Ubicacion_Sucursal";
import Articulo from "../../Articulos/model/Articulo";
import LoteArticuloSucursal from "../../../../models/LotesYCaducidad/Lote_ArticuloSucursal";

@Table({
    tableName: "stock_ubicacion_lote",
    timestamps: true,
})
export default class Stock_Ubicacion_Lote extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_stock_ubicacion_lote: string;

    @ForeignKey(() => Ubicacion_Sucursal)
    @Index
    @Column(DataType.UUID)
    declare id_ubicacion_sucursal: string;

    @ForeignKey(() => Articulo)
    @Index
    @Column(DataType.UUID)
    declare id_articulo: string;

    @ForeignKey(() => LoteArticuloSucursal)
    @Index
    @Column(DataType.UUID)
    declare id_lote: string;

    @Default(0)
    @Column(DataType.INTEGER)
    declare cantidad: number;

    @Default(0)
    @Column(DataType.INTEGER)
    declare cantidad_apartada: number;

    @BelongsTo(() => Ubicacion_Sucursal)
    declare ubicacion?: Ubicacion_Sucursal;

    @BelongsTo(() => Articulo)
    declare articulo?: Articulo;

    @BelongsTo(() => LoteArticuloSucursal)
    declare lote?: LoteArticuloSucursal;
}
