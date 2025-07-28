import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Detalles_Compra_Solicitado from '../Compra/Detalle_Compra_Solicitado'; // Asegúrate que la ruta sea correcta


@Table({ tableName: 'lotes_solicitado_compra' })
class Lotes_Solicitado_Compra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_lotesolicitado: string;

    @ForeignKey(() => Detalles_Compra_Solicitado)
    @Column(DataType.UUID)
    declare id_detallecompr_solicitado: string;
    @Column(DataType.STRING)
    declare numerolote_lote: string;

    @Column(DataType.DATEONLY)
    declare fechavencimiento_lote: Date;

    @Column(DataType.INTEGER)
    declare cantidad_lote: number;

    @BelongsTo(() => Detalles_Compra_Solicitado)
    detalleCompraSolicitado: Detalles_Compra_Solicitado;
}

export default Lotes_Solicitado_Compra;
