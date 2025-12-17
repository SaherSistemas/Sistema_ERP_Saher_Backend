import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  Unique,
  BelongsTo,
  Default,
  HasOne,
  HasMany
} from 'sequelize-typescript';
import Colonia from '../../Ubicacion/Colonia';
import Cat_Regimen_Fiscal from '../../Catalogos/Cat_Regimen_Fiscal';

import Cat_Forma_De_Pago from '../../Catalogos/Cat_Forma_De_Pago';
import Cat_uso_CFDI from '../../Catalogos/Cat_Uso_CFDI';
import Agente_de_Venta from '../../Usuarios/Agente_De_Ventas/Agente_De_Venta';
import Cat_Metodo_Pago from '../../Catalogos/Cat_Metodo_Pago';
import ListaPrecio from '../../Costo_Y_Precio/Lista_Precios/Lista_Precio';
import Pedido_Almacen from '../../../modules/Pedido_Almacen/model/Pedido_Almacen';

@Table({
  tableName: 'cliente_almacen'
})
class Cliente_Almacen extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID
  })
  declare id_cliente_alm: string;

  @Unique
  @Column({
    type: DataType.SMALLINT
  })
  declare id_interno_cliente_alm: number;

  @Column({
    type: DataType.STRING(70)
  })
  declare razon_social_cliente_alm: string;

  @Column({
    type: DataType.STRING(50)
  })
  declare nom_corto_cliente_alm: string;

  @Column({
    type: DataType.STRING(25)
  })
  declare nombre_cliente_alm: string;

  @Column({
    type: DataType.STRING(30)
  })
  declare apellido_pat_cliente_alm: string;

  @Column({
    type: DataType.STRING(30)
  })
  declare apellido_mat_cliente_alm: string;

  @Column({
    type: DataType.STRING(30)
  })
  declare curp_cliente_alm: string;

  @Column({
    type: DataType.STRING(30)
  })
  declare rfc_cliente_alm: string;

  @Column({
    type: DataType.STRING(70)
  })
  declare calle_cliente_alm: string;

  @ForeignKey(() => Colonia)
  @Column({
    type: DataType.UUID
  })
  declare id_colonia_cliente_alm: string;

  @Column({
    type: DataType.STRING(20)
  })
  declare num_telefono_cliente_alm: string;

  @Column({
    type: DataType.DECIMAL(12, 2)
  })
  declare limite_credito_cliente_alm: number;

  @Column({
    type: DataType.SMALLINT
  })
  declare plazo_pago_cliente_alm: number;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN
  })
  declare activo_cliente_alm: boolean;

  @ForeignKey(() => Agente_de_Venta)
  @Column({
    type: DataType.UUID
  })
  declare id_agente_cliente_alm: string;

  @Column({
    type: DataType.STRING(100)
  })
  declare email_cliente_alm: string;

  @ForeignKey(() => Cat_Regimen_Fiscal)
  @Column({
    type: DataType.STRING(3)
  })
  declare id_regimen_fiscal_cliente_alm: string;

  @ForeignKey(() => Cat_Metodo_Pago)
  @Column({
    type: DataType.STRING(5)
  })
  declare id_metodo_pago_cliente_alm: string;

  @ForeignKey(() => Cat_Forma_De_Pago)
  @Column({
    type: DataType.STRING(2)
  })
  declare id_forma_pago_cliente_alm: string; //EFECTVO, TRANSFERNEICA

  @ForeignKey(() => Cat_uso_CFDI)
  @Column({
    type: DataType.STRING(5)
  })
  declare uso_cfdi_cliente_alm: string;

  @ForeignKey(() => ListaPrecio)
  @Column({
    type: DataType.UUID
  })
  declare id_lista_precio_cliente_alm: string;

  @BelongsTo(() => ListaPrecio)
  listaPrecio: ListaPrecio;

  @BelongsTo(() => Agente_de_Venta)
  Agente: Agente_de_Venta;

  @HasMany(() => Pedido_Almacen)
  pedido_almacen: Pedido_Almacen;
}
export default Cliente_Almacen;
