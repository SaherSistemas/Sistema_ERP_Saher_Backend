import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from "sequelize-typescript";
import Noticia from "./Noticia";

@Table({ tableName: "categorias_noticia", timestamps: false })
export default class Categoria_Noticia extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.SMALLINT)
    declare id_categoria_noticia: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare nom_categoria_noticia: string;

    @HasMany(() => Noticia)
    Noticias: Noticia[];
}
