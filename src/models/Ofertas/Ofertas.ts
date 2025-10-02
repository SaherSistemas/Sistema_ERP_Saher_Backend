import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasMany } from "sequelize-typescript";
import AlcanceOfertas from "./OfertaAlcance";
import Empleado from "../Usuarios/Empleado";
import UsoOferta from "./UsoOferta";
import ReglaOferta from "./ReglaOferta";
import OfertaRegla from "./ReglaOferta";

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
        type: DataType.STRING
    })
    declare descripcion: string;

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
    declare dias_semana: String;

    @Column({
        type: DataType.TIME
    })
    declare hora_ini: String;
    @Column({
        type: DataType.TIME
    })
    declare hora_fin: String;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID
    })
    declare creada_por: string;
    @BelongsTo(() => Empleado)
    id_empleado: Empleado;

    @Column({
        type: DataType.STRING
    })
    declare canal_oferta: string;

    @Column({
        type: DataType.STRING
    })
    declare status_oferta: string;

    @HasMany(() => AlcanceOfertas, {
        as: 'alcances'
    })
    alcances: AlcanceOfertas[];

    @HasMany(() => ReglaOferta, {
        // foreignKey: 'id_oferta',
        as: 'reglas'
    })
    reglas!: ReglaOferta[];

   
    @HasMany(() => UsoOferta, {
        as: 'usos'
    })
    usos?: UsoOferta[];

   

}
export default Ofertas;