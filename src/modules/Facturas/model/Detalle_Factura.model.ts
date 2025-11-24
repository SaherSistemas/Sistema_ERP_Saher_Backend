//! ESTA TABLA ES SOLO PARA LAS FACTURAS TIPO I y TIPO E 
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
import Articulo from "../../../models/Articulos/Articulo";



@Table({
    tableName: "detalle_factura",
})
export class Detalle_Factura extends Model<Detalle_Factura> {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    id_detalle_fact: string;

    // FK → Factura
    @ForeignKey(() => Facturas)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    id_factura: string;

    // FK → Artículo facturado
    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    id_articulo: string;

    @Column({
        type: DataType.STRING(255)
    })
    descripcion_articulo: string;

    // Cantidad vendida en la factura
    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    cantidad_facturada: number;

    // Precio unitario del artículo
    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    precio_artic: number;

    // Subtotal sin IVA (cantidad * precio)
    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    subtotal: number;

    // Tasa de IVA aplicada (ej. 0.1600)
    @Column({
        type: DataType.DECIMAL(5, 4),
        allowNull: false
    })
    tasa_iva: number;

    // Importe del IVA (subtotal * tasa)
    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    importe_iva: number;

    // =====================
    //    RELACIONES
    // =====================

    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Articulo)
    articulo: Articulo;
}

export default Detalle_Factura;
