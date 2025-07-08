import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";

@Table({
    tableName:"metodo_de_pago"
    })

class Metodo_de_Pago extends Model {
    @PrimaryKey
    @Column({ 
        type: DataType.UUID,
     })
     declare id_metodo_pago:string;

    @Column({
        type: DataType.STRING(10)
    })
    declare clave_metodo_pago : string;

   // @Unique
    @Column({
        type: DataType.STRING(100)
    })
    declare nombre_metodo_pago : string;

    @Column({
        type: DataType.BOOLEAN
    })
    declare es_fisico : boolean;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare status_metodo_pago : boolean;  
}
export default Metodo_de_Pago;