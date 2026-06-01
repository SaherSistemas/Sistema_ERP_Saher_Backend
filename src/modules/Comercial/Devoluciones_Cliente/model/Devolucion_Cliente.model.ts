import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, BelongsTo,
    Default, AllowNull, HasMany, HasOne
} from 'sequelize-typescript';
import Facturas from '../../../Facturas/model/Facturas.model';
import Agente_De_Venta from '../../Agente_Venta/model/Agente_De_Venta';
import Devolucion_Cliente_Detalle from './Devolucion_Cliente_Detalle.model';
import Cuenta_Por_Cobrar from '../../../Finanzas/Cuentas_Por_Cobrar/model/Cuenta_Por_Cobrar.model';
// id_factura_egreso → la factura tipo-E (CFDI egreso) que se genera al aprobar

@Table({ tableName: 'devolucion_cliente', timestamps: true })
export class Devolucion_Cliente extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_devolucion_cliente: string;

    @ForeignKey(() => Facturas)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura: string;

    @ForeignKey(() => Agente_De_Venta)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_agente: string;

    // error_pedido | error_surtido | error_precio | mal_estado | otros
    @Column({ type: DataType.STRING(30), allowNull: false })
    declare motivo: string;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare motivo_otros: string | null;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare observaciones: string | null;

    // PENDIENTE | APROBADA | RECHAZADA
    @Default('PENDIENTE')
    @Column(DataType.STRING(15))
    declare estatus: string;

    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    declare fecha_solicitud: Date;

    /**
     * Resultado de la aprobación (se llena al aprobar):
     *   DESCUENTO_CXC → se descontó del saldo de la CxC (factura no pagada)
     *   NOTA_CREDITO   → se generó nota de crédito al cliente (factura ya pagada)
     */
    @AllowNull(true)
    @Column(DataType.STRING(20))
    declare resultado_aprobacion: string | null;

    /** CxC que fue ajustada (solo cuando resultado_aprobacion = 'DESCUENTO_CXC') */
    @ForeignKey(() => Cuenta_Por_Cobrar)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_cxc_afectada: string | null;

    /** UUID SAT del CFDI-E (nota de crédito fiscal) emitido al aprobar */
    @AllowNull(true)
    @Column(DataType.STRING(50))
    declare uuid_cfdi_egreso: string | null;

    /** FK al registro en tabla facturas del CFDI-E emitido */
    @ForeignKey(() => Facturas)
    @AllowNull(true)
    @Column(DataType.UUID)
    declare id_factura_egreso: string | null;

    /** ¿Se recibió la mercancía físicamente al aprobar? null = aún no procesado */
    @AllowNull(true)
    @Column(DataType.BOOLEAN)
    declare recibio_mercancia: boolean | null;

    /** Fecha en que se registró la entrada física de la mercancía devuelta */
    @AllowNull(true)
    @Column(DataType.DATEONLY)
    declare fecha_recepcion_mercancia: Date | null;

    // ── Relaciones ────────────────────────────────────────────────────────
    @BelongsTo(() => Facturas)
    declare factura: Facturas;

    @BelongsTo(() => Agente_De_Venta)
    declare agente: Agente_De_Venta;

    @BelongsTo(() => Cuenta_Por_Cobrar, 'id_cxc_afectada')
    declare cxcAfectada: Cuenta_Por_Cobrar;

    @HasMany(() => Devolucion_Cliente_Detalle)
    declare detalles: Devolucion_Cliente_Detalle[];
}

export default Devolucion_Cliente;
