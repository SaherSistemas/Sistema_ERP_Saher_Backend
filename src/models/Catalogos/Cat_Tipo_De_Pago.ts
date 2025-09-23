import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";

@Table({
    tableName: "cat_tipo_de_pago"
})


class Cat_Tipo_De_Pago extends Model {
    @PrimaryKey
    @Column({
        type: DataType.STRING(3),
    })
    declare id_tipo_pago: string;


    @Column({
        type: DataType.STRING(150),
    })
    declare descripcion_tipo_pago: string;

}
export default Cat_Tipo_De_Pago;