import { Table, Column, Model, PrimaryKey, DataType, Default, AllowNull, Index } from 'sequelize-typescript';

// Gastos que se capturan por mes para sacar la utilidad neta de las sucursales del sistema anterior (PolyDB).
// Un gasto con sucursal se le descuenta a esa sucursal; sin sucursal es un gasto general del mes.
// id_empresa_poly = empresa.empcdempn de PolyDB (no es una llave foránea porque vive en otra base de datos).
// La tabla la crea dbLocal.sync() al arrancar el servidor (no necesita migración).
@Table({ tableName: 'gasto_utilidad_sucursal', timestamps: true })
class Gasto_Utilidad_Sucursal extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_gasto_utilidad_sucursal: string;

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
    @Column(DataType.INTEGER)
    declare id_empresa_poly: number | null;

    @AllowNull(true)
    @Column(DataType.TEXT)
    declare notas: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(120))
    declare registrado_por: string | null;
}

export default Gasto_Utilidad_Sucursal;
