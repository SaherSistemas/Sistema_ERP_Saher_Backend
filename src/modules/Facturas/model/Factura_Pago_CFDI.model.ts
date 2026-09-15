//! ESTA TABLA ES SOLO PARA LAS FACTURAS TIPO P (Complemento de Pago)
import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Default
} from "sequelize-typescript";
import Facturas from "./Facturas.model";
import Cat_Forma_De_Pago from "../../Catalogos/model/Cat_Forma_De_Pago";



@Table({
    tableName: "factura_pago_cfdi",
})
export class FacturaPagoCFDI extends Model<FacturaPagoCFDI> {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID,
    })
    declare id_pago_cfdi: string;

    // FK → Factura tipo I (la factura original que se está pagando)
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_factura: string;

    // NOTA: no existe un FK propio de vuelta a la fila "P" en `facturas` (el folio
    // reservado del complemento de pago). El enlace hoy es indirecto: `facturas.id_factura_origen`
    // en esa fila P debe apuntar a este mismo `id_factura`, y así `regenerarTxtPago` los empareja.
    // Eso funciona 1:1 (un recibo = una factura pagada), pero se rompe cuando un recibo cubre
    // varias facturas (_generarTxtRecibo en CxC.service.ts): ahí hay varias filas de esta tabla
    // bajo una sola fila "P", y `id_factura_origen` solo puede apuntar a una. Agregar aquí un
    // `id_factura_pago` (FK directo a esa fila "P") resolvería el caso multi-factura de raíz.

    // Vínculo al registro de Pago_CxC (puede ser null si se timbra sin CxC)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_pago_cxc: string;

    // Información del pago
    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({
        type: DataType.CHAR(2),
        allowNull: false
    })
    declare forma_de_pago: string;

    @Default('MXN')
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    declare moneda: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare monto_pagado: number;

    // Datos del documento relacionado (Factura I)
    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare num_parcialidad: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare saldo_anterior: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare saldo_insoluto: number;

    // UUID del CFDI original (uuid_sat de la factura tipo I relacionada)
    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    declare uuid_relacionado: string;

    // UUID del complemento de pago generado por Facturapi
    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare uuid_cfdi_pago: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare pdf_url: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare xml_url: string;

    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare fecha_timbrado: Date;

    // PEN=pendiente, TIM=timbrado, ERR=error
    @Default('PEN')
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    declare estatus_timbrado: string;

    // Relaciones
    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Cat_Forma_De_Pago)
    formaDePago: Cat_Forma_De_Pago;
}

export default FacturaPagoCFDI;
