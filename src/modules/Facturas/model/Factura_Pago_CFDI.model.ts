//! ESTA TABLA ES SOLO PARA LAS FACTURAS TIPO P 
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
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    id_pago_cfdi: string;

    // FK → Factura
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    id_factura: string;             //FACTURA TIPO P 

    //INFORMACION DEL PAGO 
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

    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    moneda: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    monto_pagado: string;

    //Documentos RELACIONADOS //! FACTURAS I
    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    uuid_relacionado: string;

}

export default FacturaPagoCFDI;
