import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, Unique,
    BelongsTo, Default, HasMany
} from 'sequelize-typescript';
import Cat_Metodo_Pago from '../../Catalogos/model/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../Catalogos/model/Cat_Forma_De_Pago';
import Cat_uso_CFDI from '../../Catalogos/model/Cat_Uso_CFDI';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Detalle_Factura from './Detalle_Factura.model';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import Remision from '../../Finanzas/Remisiones/model/Remision.model';
import FacturaPagoCFDI from './Factura_Pago_CFDI.model';

@Table({ tableName: 'facturas' })
class Facturas extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_factura: string;

    //! 'I'=Ingreso | 'E'=Egreso/Nota Crédito | 'P'=Complemento Pago | 'N'=Nómina
    @Column({ type: DataType.CHAR(1), allowNull: false })
    declare tipo_cfdi: string;

    //! 'PED'=Pedido | 'TKT'=Ticket | 'MAN'=Manual | 'CXC'=CxC | 'NOM'=Nómina
    @Column({ type: DataType.CHAR(3), allowNull: false, defaultValue: 'PED' })
    declare origen_factura: string;

    @Unique
    @Column({ type: DataType.STRING(25) })
    declare folio_factura: string; //! Ej: 'A-1001' SERIE-FOLIO

    @Column({ type: DataType.DATE, allowNull: false })
    declare fecha_emision: Date;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare subtotal_factura: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare iva_factura: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare total_factura: number;

    //! 'PEN'=Pendiente timbrar | 'TIM'=Timbrada/Vigente | 'CAN'=Cancelada
    @Column({ type: DataType.CHAR(3), allowNull: false, defaultValue: 'PEN' })
    declare estatus_factura: string;

    // ── Datos SAT ──────────────────────────────────────────
    @ForeignKey(() => Cat_Metodo_Pago)
    @Column({ type: DataType.CHAR(3), allowNull: true })
    declare id_metodo_pago: string;         //! null en tipo 'P' y 'N'

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({ type: DataType.CHAR(2), allowNull: true })
    declare id_forma_pago: string;          //! null en tipo 'P' y 'N'

    @ForeignKey(() => Cat_uso_CFDI)
    @Column({ type: DataType.STRING(5), allowNull: true })
    declare uso_cfdi: string;              //! null en tipo 'P' y 'N'

    @Column({ type: DataType.TEXT, allowNull: true })
    declare uuid_sat: string;             //! Se llena al timbrar

    @Column({ type: DataType.DATE, allowNull: true })
    declare fecha_timbrado: Date;

    //! 'vigente' | 'cancelado' — viene directo del SAT
    @Column({ type: DataType.STRING(20), allowNull: true })
    declare estatus_sat: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare url_verificacion: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare pdf_url: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare xml_url: string;

    // ── Datos del timbre SAT (se llenan al timbrar con Facturapi) ──────────
    @Column({ type: DataType.TEXT, allowNull: true })
    declare sello_cfdi: string | null;       // Sello digital del emisor

    @Column({ type: DataType.TEXT, allowNull: true })
    declare sello_sat: string | null;        // Sello digital del SAT

    @Column({ type: DataType.TEXT, allowNull: true })
    declare cadena_original: string | null;  // Cadena original del complemento

    @Column({ type: DataType.STRING(30), allowNull: true })
    declare no_cert_emisor: string | null;   // Número de certificado del emisor

    @Column({ type: DataType.STRING(30), allowNull: true })
    declare no_cert_sat: string | null;      // Número de certificado del SAT

    @Column({ type: DataType.STRING(15), allowNull: true })
    declare rfc_prov_cert: string | null;    // RFC del proveedor de certificación

    // ── FKs de origen ──────────────────────────────────────
    @ForeignKey(() => Cliente_Almacen)
    @Column({ type: DataType.UUID, allowNull: true }) //! null en tipo 'N'
    declare id_cliente_alm: string;

    @ForeignKey(() => Pedido_Almacen)
    @Column({ type: DataType.UUID, allowNull: true }) //! Solo cuando origen='PED'
    declare id_pedido_alm: string;

    //! Solo cuando tipo='E' (Nota crédito) o tipo='P' (Complemento pago)
    @ForeignKey(() => Facturas)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_factura_origen: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare uuid_relacionado: string;     //! UUID SAT de la factura origen (para E y P)

    // ── Relaciones ─────────────────────────────────────────
    @BelongsTo(() => Cliente_Almacen)
    declare cliente: Cliente_Almacen;

    @BelongsTo(() => Pedido_Almacen)
    declare pedido: Pedido_Almacen;

    @BelongsTo(() => Cat_Metodo_Pago)
    declare metodoPago: Cat_Metodo_Pago;

    @BelongsTo(() => Cat_Forma_De_Pago)
    declare formaPago: Cat_Forma_De_Pago;

    @BelongsTo(() => Cat_uso_CFDI)
    declare usoCFDI: Cat_uso_CFDI;

    //! Autorreferencia — factura E o P apunta a la factura I que la origina
    @BelongsTo(() => Facturas, 'id_factura_origen')
    declare facturaOrigen: Facturas;

    @HasMany(() => Facturas, 'id_factura_origen')
    declare facturasDerivadas: Facturas[];  //! Las E y P que derivaron de esta I

    @HasMany(() => Detalle_Factura, { foreignKey: 'id_factura' })
    declare detalles: Detalle_Factura[];    //! Solo tipo I y E

    @HasMany(() => FacturaPagoCFDI, { foreignKey: 'id_factura' })
    declare complementosPago: FacturaPagoCFDI[]; //! Solo tipo P

    @HasMany(() => Remision, { foreignKey: 'id_factura' })
    declare remisiones: Remision[];
}

export default Facturas;