import {
    Table, Column, Model, PrimaryKey, DataType, Default, AllowNull, ForeignKey, BelongsTo, Index
} from 'sequelize-typescript';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';

// Gastos que se capturan por mes para sacar la utilidad neta (utilidad bruta − gastos).
// Un gasto con agente se le descuenta a ese agente; sin agente es un gasto general del mes (renta, nómina, etc.).
// La tabla la crea dbLocal.sync() al arrancar el servidor (no necesita migración).
@Table({ tableName: 'gasto_utilidad', timestamps: true })
class Gasto_Utilidad extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_gasto_utilidad: string;

    // Siempre el día 1 del mes al que pertenece el gasto
    @AllowNull(false)
    @Index
    @Column(DataType.DATEONLY)
    declare mes: string;

    @AllowNull(false)
    @Column(DataType.STRING(150))
    declare concepto: string;

    @AllowNull(true)
    @Column(DataType.STRING(60))
    declare categoria: string | null;

    @AllowNull(false)
    @Column(DataType.DECIMAL(14, 2))
    declare monto: number;

    @AllowNull(true)
    @ForeignKey(() => Agente_de_Venta)
    @Column(DataType.UUID)
    declare id_agente: string | null;

    @BelongsTo(() => Agente_de_Venta)
    declare agente?: Agente_de_Venta;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare notas: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(120))
    declare registrado_por: string | null;
}

export default Gasto_Utilidad;
