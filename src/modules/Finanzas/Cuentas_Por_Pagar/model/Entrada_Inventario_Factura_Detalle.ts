import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

/**
 * Lo que ya se dio de entrada al inventario por cada renglón de una factura de proveedor, por lote.
 *
 * La entrada se registra al CHECAR cada renglón (no al finalizar la factura). Esta tabla guarda cuánto se ha
 * dado de entrada de cada lote para poder corregir el renglón después (cantidad o lote) ajustando solo la
 * diferencia, sin duplicar existencias, y para que al finalizar la factura no se vuelva a dar la misma entrada.
 */
@Table({ tableName: 'entrada_inventario_factura_detalle', timestamps: true })
export class Entrada_Inventario_Factura_Detalle extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_entrada: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_factura_proveedor_detalle: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_lote_sucursal: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad: number;
}

export default Entrada_Inventario_Factura_Detalle;
