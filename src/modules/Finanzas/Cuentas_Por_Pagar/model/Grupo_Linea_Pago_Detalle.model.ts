import {
    Table, Column, Model, DataType, PrimaryKey, Default,
    ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import Cuenta_Por_Pagar from './Cuenta_Por_Pagar.model';
import Grupo_Linea_Pago_CxP from './Grupo_Linea_Pago_CxP.model';

@Table({ tableName: 'grupo_linea_pago_detalle', timestamps: false })
class Grupo_Linea_Pago_Detalle extends Model {
    @PrimaryKey
    @Default(uuidv4)
    @Column(DataType.UUID)
    declare id_detalle: string;

    @ForeignKey(() => Grupo_Linea_Pago_CxP)
    @Column(DataType.UUID)
    declare id_grupo: string;

    @ForeignKey(() => Cuenta_Por_Pagar)
    @Column(DataType.UUID)
    declare id_cxp: string;

    @Column(DataType.DECIMAL(12, 2))
    declare monto: number;

    @BelongsTo(() => Cuenta_Por_Pagar, 'id_cxp')
    declare cxp: Cuenta_Por_Pagar;
}

export default Grupo_Linea_Pago_Detalle;
