import { Table, Column, Model, PrimaryKey, DataType } from "sequelize-typescript";

@Table({ tableName: 'tipo_iva' })
class Tipo_IVA extends Model {
    @PrimaryKey
    @Column(DataType.SMALLINT)
    declare id_iva: number;

    @Column(DataType.STRING(30))
    declare descripcion_iva: string;

    @Column(DataType.DECIMAL(5, 2))
    declare porcentaje_iva: number;

    @Column(DataType.STRING(10)) // Ej: '0.160000'
    declare tasa_cuota: string;

    @Column(DataType.ENUM('Tasa', 'Cuota', 'Exento'))
    declare tipo_factor: 'Tasa' | 'Cuota' | 'Exento';

    @Column(DataType.STRING(3)) // Ej: '002' para IVA
    declare impuesto_sat: '001' | '002' | '003';
}

export default Tipo_IVA;
