import { Column, Model, DataType, Table, PrimaryKey, HasMany, Unique, Default } from "sequelize-typescript";
import Estado from "./Estado";

@Table({
    tableName: "pais"
})
class Pais extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID
    })
    declare id_pais: string;

    @Unique
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare id_intpais: number;

    @Unique
    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    declare nom_pais: string;

    @Unique
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
    declare activo_pais: boolean;

    @HasMany(() => Estado)
    estados: Estado[];
}

export default Pais;
