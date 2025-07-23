import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_bancos' })
class Cat_Bancos extends Model {
    @PrimaryKey
    @Column(DataType.STRING(3))
    declare id_banco: string;

    @Column(DataType.STRING(150))
    declare descrip_banco: string;
}

export default Cat_Bancos;
