import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Empresa_Sucursal from "../../Empresa_Sucursal/Empresa_Sucursal";
import DetalleListaPrecio from "./Detalle_Lista_Precio";

@Table({
    tableName: "lista_precio"
})

class ListaPrecio extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID
    }) declare id_lista_de_precio: string;

    @Unique
    @Column({
        type: DataType.INTEGER
    }) declare cod_int_lista_precio: number;

    @Column({
        type: DataType.STRING(50)
    }) declare nombre_lista_precio: string;

    @Column({
        type: DataType.STRING(50)
    }) declare descripcion_lista_precio: string;

    @Column({
        type: DataType.STRING(1)
    }) declare status_lista_precios: string;

}
export default ListaPrecio;