import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    Unique,
    BelongsTo,
    Default,
    BelongsToMany,
    HasMany
} from 'sequelize-typescript';
import Cat_Metodo_Pago from '../../../models/Catalogos/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../../models/Catalogos/Cat_Forma_De_Pago';
import Cat_uso_CFDI from '../../../models/Catalogos/Cat_Uso_CFDI';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';

import Detalle_Factura from './Detalle_Factura.model';
import Pedido_Almacen from '../../Pedido_Almacen/model/Pedido_Almacen';

@Table({
    tableName: 'facturas'
})
class Facturas extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_factura: string;

    @Unique
    @Column({
        type: DataType.SMALLINT
    })
    declare folio_factura: number; //! SERIE(EMPRESA_SUCURSAL) - COD_INT_PEDIDO_ALM(PEDIDO_ALMACEN)

    @Column({
        type: DataType.DATE
    })
    declare fecha_emision: Date;

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare subtotal_factura: number;

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare iva_factura: number;


    @Column({
        type: DataType.CHAR(3)          //! VIG, PAG, CAN, ETC
    })
    declare estatus_factura: string;

    @ForeignKey(() => Cat_Metodo_Pago)
    @Column({
        type: DataType.CHAR(3)
    })
    declare id_metodo_pago: string;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({
        type: DataType.CHAR(2)
    })
    declare id_forma_pago: string;

    @ForeignKey(() => Cat_uso_CFDI)
    @Column({
        type: DataType.STRING(5)
    })
    declare uso_cfdi: string;

    @Column({
        type: DataType.TEXT
    })
    declare uuid_sat: string;

    @Column({
        type: DataType.DATE
    })
    declare fecha_timbrado: Date;

    @Column({
        type: DataType.STRING(20)
    })
    declare estatus_sat: string;

    @Column({
        type: DataType.TEXT
    })
    declare url_verificacion: string;

    @Column({
        type: DataType.STRING
    })
    pdf_url: string;

    @Column({
        type: DataType.STRING
    })
    xml_url: string;


    @ForeignKey(() => Cliente_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_cliente_alm: string;

    @ForeignKey(() => Pedido_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_pedido_alm: string;



    //RELACIONES 
    @BelongsTo(() => Cliente_Almacen)
    cliente: Cliente_Almacen;

    @BelongsTo(() => Pedido_Almacen)
    pedido: Pedido_Almacen;

    @BelongsTo(() => Cat_Metodo_Pago)
    metodoPago: Cat_Metodo_Pago;

    @BelongsTo(() => Cat_Forma_De_Pago)
    formaPago: Cat_Forma_De_Pago;

    @BelongsTo(() => Cat_uso_CFDI)
    usoCFDI: Cat_uso_CFDI;


    // Una factura tiene muchos detalles
    @HasMany(() => Detalle_Factura, { foreignKey: 'id_factura' })
    detalles: Detalle_Factura[];
}

export default Facturas;
