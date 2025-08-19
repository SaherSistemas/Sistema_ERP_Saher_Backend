import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasMany } from "sequelize-typescript";
import AlcanceOfertas from "./OfertaAlcance";


@Table({
    tableName: "ofertas"
})

class Ofertas extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_oferta: string;

    @Column({
        type: DataType.STRING
    })
    declare nombre_oferta: string;
    
    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_ini_oferta: string;

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_fin_oferta: String;

    @Column({
        type: DataType.STRING
    })
    declare canal_oferta: string;

    @Column({
        type: DataType.BOOLEAN
    })
    declare status_oferta:boolean;

     @HasMany(() => AlcanceOfertas, { 
        as: 'alcances'})
        alcances?: AlcanceOfertas[];
}
export default Ofertas;