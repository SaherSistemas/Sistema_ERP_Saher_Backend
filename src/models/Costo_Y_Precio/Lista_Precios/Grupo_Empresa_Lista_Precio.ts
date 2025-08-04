import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Index } from "sequelize-typescript";
import Grupo_Empresa from "../../Empresa_Sucursal/Grupo_Empresa";
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

    @ForeignKey(() => ListaPrecio)
    @Index('unique_grupo_lista') // índice único compuesto
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_list_precio: string;
}

export default Grupo_Empresa_Lista_Precio;
