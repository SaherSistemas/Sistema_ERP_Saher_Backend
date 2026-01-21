import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import ListaPrecio from "./Lista_Precio";
import Articulo from "../../../Inventario/Articulos/model/Articulo";

@Table({
    tableName: "detalle_lista_precio"
})

class DetalleListaPrecio extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID
    }) declare id_detalle_lista_precio: string;

    @ForeignKey(() => ListaPrecio)
    @Column({
        type: DataType.UUID
    }) declare id_lista_precio: string;
    @BelongsTo(() => ListaPrecio)
    idlistaprecio: ListaPrecio;

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    }) declare id_artic: string;
    @BelongsTo(() => Articulo)
    idartici: Articulo;

    @Column({
        type: DataType.DECIMAL(10, 2)
    }) declare precios: number;

}
export default DetalleListaPrecio;