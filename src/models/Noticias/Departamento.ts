import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany } from "sequelize-typescript";
import Noticia from "./Noticia";

@Table({ tableName: "departamento", timestamps: false })
export default class Departamento extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.SMALLINT)
    declare id_departamento: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare nom_departamento: string;

    @HasMany(() => Noticia)
    Noticias: Noticia[];
}
