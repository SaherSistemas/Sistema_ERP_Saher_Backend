import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo
} from 'sequelize-typescript';
import Remision from './Remision.model';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

@Table({
    tableName: 'detalle_remision'
})
class Detalle_Remision extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare id_detalle_remision: string;

    @ForeignKey(() => Remision)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_remision: string;

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_articulo: string;

    @Column({
        type: DataType.STRING(255)
    })
    declare descripcion_articulo: string;

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare cantidad: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare precio_unitario: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare subtotal: number;

    @Column({
        type: DataType.DECIMAL(5, 4),
        allowNull: false
    })
    declare tasa_iva: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare importe_iva: number;

    // =====================
    //      RELACIONES
    // =====================

    @BelongsTo(() => Remision)
    remision: Remision;

    @BelongsTo(() => Articulo)
    articulo: Articulo;
}

export default Detalle_Remision;
