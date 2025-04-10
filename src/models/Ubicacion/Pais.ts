import { Column, Model, DataType, Table, PrimaryKey, HasMany, Unique } from "sequelize-typescript";
import Estado from "./Estado";

@Table({
    tableName: "pais"
})
class Pais extends Model {

    @PrimaryKey
    @Column({
        type: DataType.SMALLINT,
        allowNull: false,
    })
    declare id_pais: number;

    @Unique
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    declare nom_pais: string;

    @Column({
        type: DataType.STRING(3),
        allowNull: false,
    })
    declare cod_iso: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare activo_pais: boolean

    @HasMany(() => Estado)
    estados: Estado[];
}

export default Pais;
