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
    id_pago_cfdi: string;

    // FK → Factura tipo I (la factura original)
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    id_factura: string;

    // Vínculo al registro de Pago_CxC (puede ser null si se timbra sin CxC)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    id_pago_cxc: string;

    // Información del pago
    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({
        type: DataType.CHAR(2),
        allowNull: false
    })
    forma_de_pago: string;

    @Default('MXN')
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    moneda: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    monto_pagado: number;

    // Datos del documento relacionado (Factura I)
    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    num_parcialidad: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    saldo_anterior: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    saldo_insoluto: number;

    // UUID del CFDI original (uuid_sat de la factura tipo I relacionada)
    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    uuid_relacionado: string;

    // UUID del complemento de pago generado por Facturapi
    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    uuid_cfdi_pago: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    pdf_url: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    xml_url: string;

    // PEN=pendiente, TIM=timbrado, ERR=error
    @Default('PEN')
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    estatus_timbrado: string;

    // Relaciones
    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Cat_Forma_De_Pago)
    formaDePago: Cat_Forma_De_Pago;
}

export default FacturaPagoCFDI;
