import { Table, HasOne, Column, Model, PrimaryKey, DataType, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import LoteUsadoVenta from '../LotesYCaducidad/Lote_Usado_Venta';
import Cliente from '../Clientes/Cliente';
import Usuario from '../Usuarios/Usuario';
import Empresa_Sucursal from '../Empresa_Sucursal/Empresa_Sucursal';
import DetalleVenta from './Detalle_Venta';
import Metodo_de_Pago from '../Caja/Metodo_de_Pago';
import Empleado from '../Usuarios/Empleado';

@Table({
    tableName: "venta"
})

class Venta extends Model{

    @PrimaryKey
    @Column({
        type : DataType.UUID
    })declare id_venta:string;


    @ForeignKey(() => Cliente)
    @Column({
        type : DataType.UUID
    }) declare id_cliente: string;
    @BelongsTo(() => Cliente)
    idcliente: Cliente;

    @ForeignKey(() => Empleado)
    @Column({
        type : DataType.UUID
    }) declare id_empleado: string;
    @BelongsTo(() => Empleado)
    idempleado: Empleado;

   @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type : DataType.UUID
    }) declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    idempre: Empresa_Sucursal; 

    @Column({
        type : DataType.STRING(1)
    }) declare tipo_venta: string;
    
    @ForeignKey(()=> Metodo_de_Pago)
    @Column({
        type : DataType.UUID
    }) declare id_metodo_pago: String;
    @BelongsTo(() => Metodo_de_Pago)
    metpago: Metodo_de_Pago;

    @Column({
        type : DataType.STRING
    }) declare status_venta: String;

    @HasOne(() => DetalleVenta)
    declare detalle_venta: DetalleVenta;
}

export default Venta;