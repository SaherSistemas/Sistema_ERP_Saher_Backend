import { Table, Column, Model, PrimaryKey, DataType, Unique } from "sequelize-typescript";

@Table({ tableName: 'tipo_articulo' })
class Tipo_Articulo extends Model {
    @PrimaryKey
    @Column(DataType.UUID)
    declare id_tipo_art: string;
    @Unique
    @Column(DataType.STRING(150))
    declare nom_tipo_art: string;
}

export default Tipo_Articulo;
