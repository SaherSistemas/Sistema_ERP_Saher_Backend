import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";


@Table({
    tableName: "caja"
})  

class Caja extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_caja: string;

    @Unique
    @Column({
        type: DataType.STRING(50),
    })
    declare nombre_caja: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
    })
    declare id_empre : string;   ///es id_sucursal_venta
}

export default Caja;