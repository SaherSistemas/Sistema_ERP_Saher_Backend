import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, BelongsTo, Default
} from 'sequelize-typescript';
import Devolucion_Cliente from './Devolucion_Cliente.model';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

@Table({ tableName: 'devolucion_cliente_detalle', timestamps: false })
export class Devolucion_Cliente_Detalle extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_devolucion_detalle: string;

    @ForeignKey(() => Devolucion_Cliente)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_devolucion_cliente: string;

    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_articulo: string | null;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare descripcion_articulo: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad_facturada: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad_devolucion: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare precio_unitario: number;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
    declare subtotal_devolucion: number;

    @BelongsTo(() => Devolucion_Cliente)
    declare devolucion: Devolucion_Cliente;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;
}

export default Devolucion_Cliente_Detalle;
