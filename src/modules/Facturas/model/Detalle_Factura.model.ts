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
import Articulo from "../../Catalogos/Articulos/model/Articulo";



@Table({
    tableName: "detalle_factura",
})
export class Detalle_Factura extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_fact: string;

    // FK → Factura
    @ForeignKey(() => Facturas)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura: string;

    // FK → Artículo facturado
    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column(DataType.STRING(255))
    declare descripcion_articulo: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    declare cantidad_facturada: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare precio_artic: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare subtotal: number;

    @Column({ type: DataType.DECIMAL(5, 4), allowNull: false })
    declare tasa_iva: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare importe_iva: number;

    // ─── Relaciones ───────────────────────────────────────────────────────────

    @BelongsTo(() => Facturas)
    factura: Facturas;

    @BelongsTo(() => Articulo)
    articulo: Articulo;
}

export default Detalle_Factura;
