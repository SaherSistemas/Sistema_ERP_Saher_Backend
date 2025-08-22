import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasMany } from "sequelize-typescript";
import Ofertas from "./Ofertas";
import Venta from "../Venta/Venta";
import Cliente from "../Clientes/Cliente";


@Table({
    tableName: "uso_oferta"
})

class UsoOferta extends Model {

    @PrimaryKey
     @Column({
        type: DataType.UUID
    })
    declare id_uso: string;

    @ForeignKey(() => Ofertas)
    @Column({
        type: DataType.UUID
    })
    declare id_oferta: string;
    @BelongsTo(()=> Ofertas)
    oferta : Ofertas;
  
    @ForeignKey(() => Venta)
    @Column({
        type: DataType.UUID
    })
    declare id_venta: string;
    @BelongsTo(()=> Venta)
    venta? : Venta;

    @ForeignKey(() => Cliente)
    @Column({
        type: DataType.UUID
    })
    declare id_cliente: string;
    @BelongsTo(()=> Cliente)
    cliente : Cliente;

    @Column({
        type: DataType.DATE
    })
    declare fecha_uso: Date;  
   
}
export default UsoOferta;