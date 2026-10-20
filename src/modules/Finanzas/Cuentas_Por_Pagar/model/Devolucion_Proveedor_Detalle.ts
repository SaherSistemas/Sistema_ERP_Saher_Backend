import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

/** Renglón de una devolución al proveedor: artículo, lote, cantidad y su costo (precio facturado con descuento + IVA). */
@Table({ tableName: 'devolucion_proveedor_detalle', timestamps: false })
export class Devolucion_Proveedor_Detalle extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_devolucion_detalle: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_devolucion_proveedor: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura_proveedor_detalle: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.UUID, allowNull: true })
    declare id_lote_sucursal: string | null;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare descripcion_articulo: string | null;

    @Column({ type: DataType.STRING(50), allowNull: false })
    declare numero_lote: string;

    @Column({ type: DataType.DATE, allowNull: true })
    declare fecha_caducidad: Date | null;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad: number;

    /** Precio neto por pieza (con el descuento de la factura, sin IVA) */
    @Column({ type: DataType.DECIMAL(14, 4), allowNull: false })
    declare precio_unitario: number;

    @Column({ type: DataType.DECIMAL(14, 4), allowNull: false })
    declare iva_unitario: number;
}

export default Devolucion_Proveedor_Detalle;
