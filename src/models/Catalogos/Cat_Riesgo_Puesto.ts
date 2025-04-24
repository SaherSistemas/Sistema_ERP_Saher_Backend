import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_riesgo_puesto' })
class Cat_Riesgo_Puesto extends Model {
    @PrimaryKey
    @Column(DataType.STRING(1))
    declare id_riesgo: string;

    @Column(DataType.STRING(150))
    declare descrip_riesgo: string;
}

export default Cat_Riesgo_Puesto;
