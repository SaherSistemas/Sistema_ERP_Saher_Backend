import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, BelongsTo, Default
} from 'sequelize-typescript';
import NotasCreditoProveedor from '../NC/NotasCreditoProveedor';
import Factura_Compra_Proveedor from '../../../modules/Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import Articulo from '../../../modules/Catalogos/Articulos/model/Articulo';

/*
 * Faltante_Factura_Proveedor
 * --------------------------
 * Registra cada artículo que aparece en la factura del proveedor
 * pero que NO llegó físicamente al momento del chequeo.
 *
 * ¡NO es una devolución! (Devoluciones = artículos que SÍ llegaron
 * y se regresaron al proveedor). Aquí el proveedor simplemente
 * no envió la mercancía que cobró.
 *
 * estado:
 *   'P' = Pendiente  → faltante sin resolver
 *   'R' = Recibido   → el proveedor reenvió el artículo después
 *   'C' = Condonado  → se aceptó el crédito, no vendrá físicamente
 */
@Table({
    tableName: 'faltante_factura_proveedor',
    timestamps: true,
})
class Faltante_Factura_Proveedor extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_faltante: string;

    // NC generada automáticamente que cubre este faltante
    @ForeignKey(() => NotasCreditoProveedor)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_nc: string;

    @BelongsTo(() => NotasCreditoProveedor)
    declare notaCredito: NotasCreditoProveedor;

    // Factura en la que se detectó el faltante
    @ForeignKey(() => Factura_Compra_Proveedor)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura_proveedor: string;

    @BelongsTo(() => Factura_Compra_Proveedor)
    declare factura: Factura_Compra_Proveedor;

    // Artículo que faltó
    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;

    // Cuántas piezas faltaron
    @Column({ type: DataType.SMALLINT, allowNull: false })
    declare cantidad_faltante: number;

    // Precio unitario sin IVA según la factura
    @Default(0)
    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    declare precio_unitario: number;

    // Monto de IVA por unidad (precio_unitario × tasa_iva)
    @Default(0)
    @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
    declare iva_unitario: number;

    // Estado de resolución
    @Default('P')
    @Column({ type: DataType.CHAR(1), allowNull: false })
    declare estado: string;
}

export default Faltante_Factura_Proveedor;
