import { Table, Column, Model, DataType, PrimaryKey, ForeignKey } from "sequelize-typescript";
import UnidadMedida from "./UnidadMedida";
import Clasificacion from "./Clasificacion";
import Temporabilidad from "./Temporabilidad";

@Table({
    tableName: "articulo",
})
class Articulo extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_artic: string;

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare cod_int_artic: number;

    @Column({
        type: DataType.STRING(15),
        allowNull: false
    })
    declare cod_barr_artic: string;

    @Column({
        type: DataType.STRING(70),
        allowNull: false
    })
    declare des_artic: string;

    @Column({
        type: DataType.STRING(70),
        allowNull: false
    })
    declare des_gener_artic: string;

    @ForeignKey(() => UnidadMedida)
    @Column({
        type: DataType.CHAR(1),
        allowNull: false
    })
    declare unidmedi_artic: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    declare status_artic: boolean;

    @ForeignKey(() => Clasificacion)
    @Column({
        type: DataType.CHAR(1),
        allowNull: false
    })
    declare classif_artic: string;

    @Column({
        type: DataType.STRING(50),
    })
    declare fabri_artic: string;

    @Column({
        type: DataType.STRING(150),
        allowNull: true
    })
    declare imagen_artic: string;

    @Column({
        type: DataType.CHAR(1),
        allowNull: false
    })
    declare caduc_artic: string;

    @ForeignKey(() => Temporabilidad)
    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare tempora_artic: number;

    @Column({
        type: DataType.STRING(20),
        allowNull: false
    })
    declare satclave_artic: string;
}

export default Articulo;
