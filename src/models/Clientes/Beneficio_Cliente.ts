import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Tipo_Cliente from "./Tipo_Cliente";

@Table({
    tableName: "beneficio_cliente"    
})

    class Beneficio_Cliente extends Model{

    @PrimaryKey
     @Column({ 
        type: DataType.UUID,
     })
     declare id_beneficio:string;

    @ForeignKey(()=> Tipo_Cliente)
    @Column({ 
        type: DataType.UUID,
     })
     declare id_tipo_cliente:string;

    @Column({ 
        type: DataType.STRING(100),
     })
     declare tipo_beneficio:string;

    @Column({ 
        type: DataType.STRING(100),
     })
     declare porcentaje_beneficio:string;

    @Column({ 
        type: DataType.BOOLEAN,
     })
     declare status_beneficio:boolean;
   }
   export default Beneficio_Cliente;