import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Colonia from "../Ubicacion/Colonia"

@Table({
    tableName:"cliente"
})

class Cliente extends Model{
    @PrimaryKey
    @Column({ 
        type: DataType.UUID,
     })
     declare id_cliente:string;

    @Unique
    @Column({
        type: DataType.STRING(10)
    })
    declare telefono_cliente : string;

    @Column({
        type: DataType.STRING(70)
    })
    declare nombre_cliente : string;

    @Column({
        type: DataType.STRING(70)
    })
    declare apellido_pat_cliente : string;

    @Column({
        type: DataType.STRING(70)
    })
    declare apellido_mat_cliente : string;

    @Column({
        type: DataType.DATE
    })
    declare fec_nac_cliente : string;

    @ForeignKey(() => Colonia)
     @Column({
        type: DataType.UUID
    })
    declare colonia_cliente : string;

    @Column({
        type: DataType.STRING(50)
    })
    declare calle_cliente : string;

    @Column({
        type: DataType.STRING(50)
    })
    declare email_cliente : string;

    @Column({
        type: DataType.CHAR(1)
    })
    declare genero_cliente : string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare status_cliente : boolean;


    @BelongsTo(() => Colonia)
    colonia: Colonia;
}
export default Cliente;