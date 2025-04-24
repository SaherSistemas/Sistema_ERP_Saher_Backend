import { Table, Column, Model, PrimaryKey, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'cat_tipo_jornada'
})
class Cat_Tipo_Jornada extends Model {
    @PrimaryKey
    @Column(DataType.STRING(2))
    declare id_tipojornada: string;

    @Column(DataType.STRING(150))
    declare descripcion_tipojorn: string;
}

export default Cat_Tipo_Jornada;
