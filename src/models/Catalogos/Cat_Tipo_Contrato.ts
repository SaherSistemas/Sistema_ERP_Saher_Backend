import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({ tableName: 'cat_tipo_contrato' })
class Cat_Tipo_Contrato extends Model {
    @PrimaryKey
    @Column(DataType.STRING(2))
    declare id_tipocontrato: string;

    @Column(DataType.STRING(150))
    declare descripcion_tipocon: string;
}

export default Cat_Tipo_Contrato;
