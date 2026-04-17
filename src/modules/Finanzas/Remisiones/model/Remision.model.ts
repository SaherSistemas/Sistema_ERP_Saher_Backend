import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    Unique,
    BelongsTo,
    HasMany,
    HasOne
} from 'sequelize-typescript';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Detalle_Remision from './Detalle_Remision.model';
import Facturas from '../../../Facturas/model/Facturas.model';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import Pedido_Almacen from '../../../Almacen/Pedido/model/Pedido_Almacen';

/*
    ESTATUS REMISION
    PEN → Pendiente  (sin abonos)
    PAR → Parcial    (abonos pero no liquidada)
    LIQ → Liquidada  (pagada al 100%)
    CAN → Cancelada
*/

@Table({
    tableName: 'remision'
})
class Remision extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare id_remision: string;

    @Unique
    @Column({
        type: DataType.SMALLINT
    })
    declare folio_remision: number;

    // Factura de Público General de la que proviene esta remisión
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_factura: string;

    // Pedido del que viene — nos da el cliente real y el agente automáticamente
    @ForeignKey(() => Pedido_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_pedido_alm: string;

    // Cliente real (sacado del pedido → id_cliente_pedido_alm)
    @ForeignKey(() => Cliente_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_cliente_alm: string;

    // Agente (sacado del pedido → id_agente_pedido_alm)
    @ForeignKey(() => Agente_de_Venta)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_agente: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare fecha_remision: Date;

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare dias_credito: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare fecha_vencimiento: Date;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare subtotal_remision: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare iva_remision: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare total_remision: number;

    @Column({
        type: DataType.CHAR(3),  //! PEN, PAR, LIQ, CAN
        allowNull: false,
        defaultValue: 'PEN'
    })
    declare estatus_remision: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare notas: string;

    // =====================
    //      RELACIONES
    // =====================

    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Pedido_Almacen)
    pedido: Pedido_Almacen;

    @BelongsTo(() => Cliente_Almacen)
    cliente: Cliente_Almacen;

    @BelongsTo(() => Agente_de_Venta)
    agente: Agente_de_Venta;

    @HasMany(() => Detalle_Remision)
    detalles: Detalle_Remision[];
}

export default Remision;
