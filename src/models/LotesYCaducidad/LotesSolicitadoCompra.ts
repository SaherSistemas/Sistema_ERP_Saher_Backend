import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';


@Table({ tableName: 'lotes_solicitado_compra' })
class Lotes_Solicitado_Compra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_lotesolicitado: string;

    @Column(DataType.UUID)
    declare id_detallecompr_solicitado: string;

    @Column(DataType.UUID)
    declare numerolote_lote: string;

    @Column(DataType.UUID)
    declare fechavencimiento_lote: Date;

    @Column(DataType.UUID)
    declare cantidad_lote: Date;
}

export default Lotes_Solicitado_Compra;
