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
  BelongsToMany,
  HasMany
} from 'sequelize-typescript';
import UnidadMedida from './UnidadMedida';
import Temporabilidad from './Temporabilidad';
import Tipo_IVA from './Tipo_IVA';
import Prioridad_Articulo from './Prioridad_Articulo';
import Categoria_Articulo from './Categoria_Articulo';
import Presentacion_Articulo from './Presentacion_Articulo';
import RecetaMedica from '../RecetaMedica/RecetaMedica';
import RecetaArticulo from '../RecetaMedica/Receta_Articulo';
import DetalleListaPrecio from '../Costo_Y_Precio/Lista_Precios/Detalle_Lista_Precio';

@Table({
  tableName: 'articulo'
})
class Articulo extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID
  })
  declare id_artic: string;

  @Unique
  @Column({
    type: DataType.SMALLINT
  })
  declare cod_int_artic: number;

  @Unique
  @Column({
    type: DataType.STRING(15)
  })
  declare cod_barr_artic: string;

  @Column({
    type: DataType.STRING(255)
  })
  declare des_artic: string;

  @Column({
    type: DataType.STRING(255)
  })
  declare des_gener_artic: string;

  @Column({
    type: DataType.TEXT
  })
  declare desc_detallada_artic: string;

  @ForeignKey(() => Tipo_IVA)
  @Column({
    type: DataType.SMALLINT
  })
  declare tipo_de_iva: number;

  @Column({
    type: DataType.CHAR(1)
  })
  declare import_cadylote: string;

  @ForeignKey(() => UnidadMedida)
  @Column({
    type: DataType.SMALLINT
  })
  declare unidmedi_artic: number;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN
  })
  declare status_artic: boolean;

  @ForeignKey(() => Presentacion_Articulo)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare id_presentacion: string;

  @ForeignKey(() => Categoria_Articulo)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare id_categoria: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true
  })
  declare fabri_artic: string;

  @Column({
    type: DataType.STRING(150),
    allowNull: true
  })
  declare imagen_artic: string;

  @ForeignKey(() => Temporabilidad)
  @Column({
    type: DataType.SMALLINT
  })
  declare tempora_artic: number;

  @Column({
    type: DataType.STRING(20)
  })
  declare satclave_artic: string;

  @ForeignKey(() => Prioridad_Articulo)
  @Column({
    type: DataType.SMALLINT
  })
  declare prioridad_artic: number;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN
  })
  declare necesita_receta: boolean;

  @HasMany(() => DetalleListaPrecio)
  detalle_lista_precio: DetalleListaPrecio;
  //RELACIONES
  @BelongsTo(() => UnidadMedida)
  unidadMedida: UnidadMedida;

  @BelongsTo(() => Presentacion_Articulo)
  presentacion: Presentacion_Articulo;

  @BelongsTo(() => Temporabilidad)
  temporabilidad: Temporabilidad;

  @BelongsTo(() => Tipo_IVA)
  tipo_iva: Tipo_IVA;

  @BelongsTo(() => Prioridad_Articulo)
  prioridad_articulo: Prioridad_Articulo;

  @BelongsTo(() => Categoria_Articulo)
  categoria: Categoria_Articulo;

  @BelongsToMany(() => RecetaMedica, () => RecetaArticulo)
  recetas!: Array<RecetaMedica & { RecetaArticulo: RecetaArticulo }>;
}

export default Articulo;
