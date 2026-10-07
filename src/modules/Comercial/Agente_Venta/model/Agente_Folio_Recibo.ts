import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

// Folio mínimo del próximo recibo AUTOMÁTICO de un agente (por su clave, ej. "FRF"). Sirve para que un agente que empieza a
// usar la impresora de tickets arranque en un número más alto (p. ej. 15001) sin "quemar" los folios que ya se tienen
// de otro rango (talonarios físicos). El siguiente recibo automático es el mayor entre el consecutivo normal (último
// folio usado + 1) y este mínimo. Los folios que el agente escribe a mano (recibo físico) no se ven afectados.
// Va en su propia tabla (que el servidor crea sola al arrancar), sin alterar la de agentes.
@Table({
    tableName: 'agente_folio_recibo',
    timestamps: false,
})
class Agente_Folio_Recibo extends Model {

    @PrimaryKey
    @Column({ type: DataType.STRING(20) })
    declare cod_identi_agente: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare folio_minimo: number;
}

export default Agente_Folio_Recibo;
