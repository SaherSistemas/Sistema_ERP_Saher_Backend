import { Column, Model, DataType, Table, PrimaryKey } from "sequelize-typescript";

@Table({
    tableName: "pais"
})
class Pais extends Model {

    @PrimaryKey
    @Column({
        type: DataType.SMALLINT,
        allowNull: false,
    })
    id_pais: number;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    nom_pais: string;

    @Column({
        type: DataType.STRING(3),
        allowNull: false,
    })
    cod_iso: string;
}

export default Pais;
