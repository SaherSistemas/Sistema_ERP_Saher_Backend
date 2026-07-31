import {
    Table, Column, Model, DataType, PrimaryKey, Default,
    ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Grupo_Linea_Pago_Detalle from './Grupo_Linea_Pago_Detalle.model';

@Table({ tableName: 'grupo_linea_pago_cxp', timestamps: true })
class Grupo_Linea_Pago_CxP extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column(DataType.UUID)
    declare id_grupo: string;

    @ForeignKey(() => Proveedor)
    @Column(DataType.UUID)
    declare id_proveedor: string;

    @Column(DataType.DECIMAL(12, 2))
    declare monto_total: number;

    @Column(DataType.DATEONLY)
    declare fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column(DataType.CHAR(2))
    declare id_forma_pago: string | null;

    @Column(DataType.STRING(100))
    declare referencia: string | null;

    @Column(DataType.TEXT)
    declare notas: string | null;

    @Column(DataType.TEXT)
    declare url_comprobante: string | null;

    @Default('PEN')
    @Column(DataType.CHAR(3))
    declare estado: string; // PEN | REG | CAN

    @Column(DataType.UUID)
    declare id_empleado_genera: string | null;

    @BelongsTo(() => Proveedor, 'id_proveedor')
    declare proveedor: Proveedor;

    @BelongsTo(() => Cat_Forma_De_Pago, 'id_forma_pago')
    declare forma_pago: Cat_Forma_De_Pago;

    @HasMany(() => Grupo_Linea_Pago_Detalle, 'id_grupo')
    declare detalles: Grupo_Linea_Pago_Detalle[];
}

export default Grupo_Linea_Pago_CxP;
