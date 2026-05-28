import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Default,
} from 'sequelize-typescript';
import Agente_de_Venta from './Agente_De_Venta';
import Cliente_Almacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';

/*
    REGLA DE COMISIÓN POR AGENTE (y opcionalmente por cliente)

    tipo_regla:
      'anticipado'  → pct si pago llegó antes de fecha_vencimiento
      'fijo'        → pct siempre, independiente de cuándo pagó
      'escalonado'  → porcentaje según tramos de días de retraso

    id_cliente_alm:
      NULL  → regla base del agente (aplica a todos sus clientes sin excepción)
      UUID  → excepción: esta regla sobreescribe la base solo para ese cliente

    regla_json:
      Almacena el objeto completo según el tipo:
        anticipado  → { tipo, pct }
        fijo        → { tipo, pct }
        escalonado  → { tipo, tramos: [{ dias_max, pct }, ...] }
*/

@Table({
    tableName: 'comision_regla_agente',
    timestamps: false,
})
class Comision_Regla_Agente extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id_regla: string;

    // Agente al que pertenece la regla
    @ForeignKey(() => Agente_de_Venta)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_agente: string;

    // NULL = regla base; UUID = excepción por cliente
    @ForeignKey(() => Cliente_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare id_cliente_alm: string | null;

    // 'anticipado' | 'fijo' | 'escalonado'
    @Column({
        type: DataType.STRING(15),
        allowNull: false,
    })
    declare tipo_regla: string;

    // Objeto JSON con la configuración completa de la regla
    @Column({
        type: DataType.JSONB,
        allowNull: false,
    })
    declare regla_json: object;

    // ── RELACIONES ────────────────────────────────────────────────────────────

    @BelongsTo(() => Agente_de_Venta)
    agente: Agente_de_Venta;

    @BelongsTo(() => Cliente_Almacen)
    cliente_almacen: Cliente_Almacen;
}

export default Comision_Regla_Agente;
