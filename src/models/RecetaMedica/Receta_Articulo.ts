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
} from "sequelize-typescript";
import Articulo from "../Articulos/Articulo";
import RecetaMedica from "./RecetaMedica";
import DetalleVenta from "../Venta/Detalle_Venta";

@Table({ 
    tableName: "receta_articulo"
})
class RecetaArticulo extends Model {

  @PrimaryKey
  @Default(DataType.UUIDV4) 
  @Column({ 
    field: 'id_receta_articulo', 
    type: DataType.UUID })
  declare id_receta_articulo: string;

  @ForeignKey(() => RecetaMedica)
  @Column({ 
    field: "id_receta", 
    type: DataType.UUID, 
    allowNull: false })
  declare id_receta: string;

  @ForeignKey(() => Articulo)
  @Column({ field: "id_articulo", 
    type: DataType.UUID, 
     })
  declare id_articulo: string;

  @Column({
    type: DataType.STRING(50),
  })
  declare dosis?: string | null; 

  @Column({
    type: DataType.DECIMAL,
  })
  declare cantidad_prescrita?: number | null;

  @Column({
    type: DataType.STRING,
  })
  declare indicaciones?: string | null; 

  @Column({
    type: DataType.BOOLEAN,
  })
  declare sustitucion_permitida?: boolean;
    
  @ForeignKey(() => DetalleVenta)
  @Column({ type: DataType.UUID, allowNull: true })
  declare id_detalle_venta?: string | null;
  
  
  @BelongsTo(() => DetalleVenta)    
  detalleVenta?: DetalleVenta;

  @BelongsTo(() => RecetaMedica)
  receta!: RecetaMedica;

  @BelongsTo(() => Articulo)
  articulo!: Articulo;

} export default RecetaArticulo;

