import {
    Table, Column, Model, DataType,
    PrimaryKey, Default, AllowNull,
    ForeignKey, BelongsTo
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import { Entrega_Pedido } from './Entrega_Pedido';

@Table({ tableName: 'entrega_pedido_firma', timestamps: true })
export class Entrega_Pedido_Firma extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column({ type: DataType.UUID })
    declare id_firma: string;

    @ForeignKey(() => Entrega_Pedido)
    @AllowNull(false)
    @Column({ type: DataType.UUID })
    declare id_entrega: string;

    @AllowNull(false)
    @Column({ type: DataType.ENUM('RECIBE', 'ENTREGA', 'EVIDENCIA') })
    declare tipo_firma: 'RECIBE' | 'ENTREGA' | 'EVIDENCIA';

    @AllowNull(false)
    @Column({ type: DataType.STRING(50) })
    declare nombre_persona: string;

    @AllowNull(false)
    @Column({ type: DataType.STRING(50) })
    declare puesto_o_relacion: string;

    @AllowNull(false)
    @Column({ type: DataType.TEXT })
    declare firma_url: string;

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column({ type: DataType.DATE })
    declare fecha_firma: Date;

    @BelongsTo(() => Entrega_Pedido, {
        foreignKey: 'id_entrega',
        targetKey: 'id_entrega_pedido',
        as: 'entrega'
    })
    declare entrega?: Entrega_Pedido;
}