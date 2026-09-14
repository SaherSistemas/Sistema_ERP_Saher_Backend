import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_bancos' })
class Cat_Bancos extends Model {
    @PrimaryKey
    @Column(DataType.STRING(3))
    declare id_banco: string;

    @Column(DataType.STRING(150))
    declare descrip_banco: string;

    @Column({ type: DataType.STRING(13), allowNull: true })
    declare rfc_banco: string | null;

    @Column({ type: DataType.STRING(10), allowNull: true })
    declare clave_sat_banco: string | null;
}

export default Cat_Bancos;
