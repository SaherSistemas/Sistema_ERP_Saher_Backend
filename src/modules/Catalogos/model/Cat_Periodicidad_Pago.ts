import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_periodicidad_pago' })
class Cat_Periodicidad_Pago extends Model {
    @PrimaryKey
    @Column(DataType.STRING(2))
    declare id_periodicidad: string;

    @Column(DataType.STRING(150))
    declare descrip_periodical: string;
}

export default Cat_Periodicidad_Pago;
