import { HasOne, Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Beneficio_Cliente from "./Beneficio_Cliente";


@Table({
    tableName:"tipo_cliente" 
})

    class Tipo_Cliente extends Model{

     @PrimaryKey
     @Column({ 
        type: DataType.UUID,
     })
     declare id_tipo_cliente:string;

    @Column({ 
        type: DataType.STRING(50),
     })
     declare nom_tipo_cliente: string;
    
    @Column({ 
        type: DataType.STRING(100),
     })
     declare desc_tipo_cliente:string;

     @HasOne(() => Beneficio_Cliente, {
    foreignKey: "id_tipo_cliente",
    as: "beneficio", 
    }) beneficio: Beneficio_Cliente;
    }



export default Tipo_Cliente;