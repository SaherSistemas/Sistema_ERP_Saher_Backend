import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import Tipo_Articulo from "./Tipo_Articulo";
import Articulo from "./Articulo";

@Table({
    tableName: "categoria_articulo",
})
class Categoria_Articulo extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_categoria: string

    @Column({
        type: DataType.STRING(30)
    })
    declare nom_categoria: string

    @ForeignKey(() => Tipo_Articulo)
    @Column({
        type: DataType.UUID
    })
    declare id_tipoproducto: string


    @BelongsTo(() => Tipo_Articulo)
    tipoArticulo: Tipo_Articulo;


}


export default Categoria_Articulo