import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Default, BelongsTo } from 'sequelize-typescript';
import Devoluciones_Compras from '../Devolucion/Devoluciones_Compras';


@Table({
    tableName: 'notas_credito',
    timestamps: true,
})
class NotasCreditoProveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_nc: string;

    @ForeignKey(() => Devoluciones_Compras)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_devo: string;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
    })
    declare folio_nc: string;

    @Column({
        type: DataType.TEXT
    })
    declare motivo_nc: string

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare fecha_emision: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare total_nc: number;


    @Column({
        type: DataType.TEXT
    })
    declare url_pdf_nc: string

    @Column({
        type: DataType.TEXT
    })
    declare url_xml_nc: string



}

export default NotasCreditoProveedor;
