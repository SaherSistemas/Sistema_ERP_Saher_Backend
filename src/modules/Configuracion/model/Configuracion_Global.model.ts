import { Table, Column, Model, DataType, PrimaryKey, Unique } from 'sequelize-typescript';

/*
    Tabla de configuración global del sistema.
    Cada fila es una regla/parámetro identificado por su clave única.
    tipo: 'boolean' | 'number' | 'string'
*/
@Table({ tableName: 'configuracion_global', timestamps: true })
class Configuracion_Global extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
    declare id_config: string;

    @Unique
    @Column({ type: DataType.STRING(100), allowNull: false })
    declare clave: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare valor: string;

    @Column({ type: DataType.ENUM('boolean', 'number', 'string'), defaultValue: 'boolean' })
    declare tipo: 'boolean' | 'number' | 'string';

    @Column({ type: DataType.STRING(50), defaultValue: 'general' })
    declare categoria: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare descripcion: string | null;
}

export default Configuracion_Global;
