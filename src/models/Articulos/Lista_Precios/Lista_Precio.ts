import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Empresa_Sucursal from "../../Empresa_Sucursal/Empresa_Sucursal";
import Colonia from "../../Ubicacion/Colonia";
import Articulo from "../Articulo";

@Table({
    tableName:"ListaPrecios"
})

class ListaPrecios extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID
    })declare id_lista_de_precio : string;

    @Unique
    @Column({
        type: DataType.INTEGER
    })declare id_interno_lista_precio: number;
    
    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID
    })declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    empresa_Sucursal : Empresa_Sucursal;

   // @ForeignKey(() => DetalleListaPrecio)
    @Column({
        type: DataType.UUID
    })declare id_detalle_listaPrecio: string;
    // @BelongsTo(() => DetalleListaPrecio)
    // detallelistaprecio : DetalleListaPrecio;
    

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })declare id_artic: string;
    @BelongsTo(() => Articulo)
    articulo : Articulo;
    
    @Column({
        type: DataType.STRING(50)
    })declare nombre_lista_precio: string;

    @Column({
        type: DataType.STRING(50)
    })declare descripcion_lista_precio: string;

    @Column({
        type: DataType.DATE
    })declare fecha_inicio: Date;

    @Column({
        type: DataType.DATE
    })declare fecha_fin: Date;

    @Column({
        type: DataType.STRING(1)
    })declare status_lista_precios: string;

}
export default ListaPrecios;