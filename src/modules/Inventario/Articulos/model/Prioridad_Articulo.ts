import { Table, Column, Model, PrimaryKey, DataType } from "sequelize-typescript";

@Table({ tableName: 'prioridad_articulo' })
class Prioridad_Articulo extends Model {
    @PrimaryKey
    @Column(DataType.SMALLINT)
    declare id_prioridad: number;

    @Column(DataType.STRING(30))
    declare descrip_prioridad: string
}

export default Prioridad_Articulo;