import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default } from "sequelize-typescript";
import Colonia from "../Ubicacion/Colonia"
import Tipo_Cliente from "./Tipo_Cliente";
import ListaPrecio from "../Costo_Y_Precio/Lista_Precios/Lista_Precio";
import Empleado from "../Usuarios/Empleado";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";

@Table({
    tableName: "cliente"
})

class Cliente extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_cliente: string;

    @Unique
    @Column({
        type: DataType.STRING(10)
    })
    declare telefono_cliente: string;

    @Column({
        type: DataType.STRING(70)
    })
    declare nombre_cliente: string;

    @Column({
        type: DataType.STRING(70)
    })
    declare apellido_pat_cliente: string;

    @Column({
        type: DataType.STRING(70)
    })
    declare apellido_mat_cliente: string;

    @Column({
        type: DataType.DATE
    })
    declare fec_nac_cliente: string;

    @ForeignKey(() => Colonia)
    @Column({
        type: DataType.UUID
    })
    declare id_colonia: string;
    @BelongsTo(() => Colonia)
    colonia: Colonia;

    @Column({
        type: DataType.STRING(50)
    })
    declare calle_cliente: string;

    @Column({
        type: DataType.STRING(50)
    })
    declare email_cliente: string;

    @Column({
        type: DataType.STRING
    })
    declare genero_cliente: string;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare status_cliente: boolean;

    @ForeignKey(() => Tipo_Cliente)
    @Column({
        type: DataType.UUID
    })
    declare id_tipo_cliente: string;
    @BelongsTo(() => Tipo_Cliente)
    tipo_cliente: Tipo_Cliente;

    @ForeignKey(() => ListaPrecio)
    @Column({
        type: DataType.UUID
    })
    declare id_lista_precio: string;
    @BelongsTo(() => ListaPrecio)
    listaPrecio: ListaPrecio;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID
    })
    declare id_empleado: string;
    @BelongsTo(() => Empleado)
    empleado: Empleado;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID
    })
    declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    empresaSucursal: Empresa_Sucursal;

}
export default Cliente;