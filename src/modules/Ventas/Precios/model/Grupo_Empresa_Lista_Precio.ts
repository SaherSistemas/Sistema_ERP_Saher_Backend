import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Index, BelongsTo } from "sequelize-typescript";
import Grupo_Empresa from "../../../../models/Empresa_Sucursal/Grupo_Empresa";
import ListaPrecio from "./Lista_Precio";

@Table({
    tableName: "grupo_empresa_lista_precio"
})
class Grupo_Empresa_Lista_Precio extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_grupo_empresa_lista_precio: string;

    @ForeignKey(() => Grupo_Empresa)
    @Index('unique_grupo_lista') // índice único compuesto
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_grup_empresa: string;

    @BelongsTo(() => Grupo_Empresa)
    declare grupo_empresa?: Grupo_Empresa;

    @ForeignKey(() => ListaPrecio)
    @Index('unique_grupo_lista') // índice único compuesto
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_list_precio: string;

    @BelongsTo(() => ListaPrecio)
    declare lista_precio?: ListaPrecio


}

export default Grupo_Empresa_Lista_Precio;
