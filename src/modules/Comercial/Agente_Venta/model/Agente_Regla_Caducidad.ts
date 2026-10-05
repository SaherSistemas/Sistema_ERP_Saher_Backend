import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

// Regla de caducidad mínima por agente: algunos agentes solo reciben mercancía con caducidad mayor a N meses.
// Va en su propia tabla (que el servidor crea sola al arrancar) para no tener que alterar la tabla de agentes.
// 0 o sin renglón = sin regla (se surte primero lo que caduca primero, como siempre).
@Table({
    tableName: 'agente_regla_caducidad',
    timestamps: true,
})
class Agente_Regla_Caducidad extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_agente: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare meses_min_caducidad: number;
}

export default Agente_Regla_Caducidad;
