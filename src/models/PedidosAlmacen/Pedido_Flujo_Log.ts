import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Cliente_Almacen from "../Clientes/Cliente_Almacen/Cliente_Almacen";

@Table({
    tableName: "pedido_flujo_log"
})


class Pedido_flujo_Log extends Model {


}
export default Pedido_flujo_Log;